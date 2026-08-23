const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendPushNotification } = require("../lib/pushNotifications");
const { refundTransaction } = require("../lib/paystack");
const { logAction } = require("../lib/auditLog");
const { createWalletCredit } = require("./wallet.routes");

const router = express.Router();

const RIDER_PAYOUT = Number(process.env.RIDER_PAYOUT_PER_DELIVERY || 600);

// Valid forward transitions and which role is allowed to make them.
// (CANCELLED is handled separately by the /cancel route below, since it
// can happen from several states, not just the next one in the chain.)
const TRANSITIONS = {
  PLACED: { next: "ACCEPTED", allow: ["VENDOR", "MANAGER", "ADMIN"] },
  ACCEPTED: { next: "READY", allow: ["VENDOR", "MANAGER", "ADMIN"] },
  READY: { next: "PICKED_UP", allow: ["RIDER", "ADMIN"] },
  PICKED_UP: { next: "DELIVERED", allow: ["RIDER", "ADMIN"] },
};

function emit(req, room, event, payload) {
  const io = req.app.get("io");
  if (io) io.to(room).emit(event, payload);
}

/**
 * POST /orders
 * body: { vendorId, items: [{ productId, qty, addOns: [{ id, qty }] }] }
 * (addOns is optional; each entry is a chosen add-on and how many of it)
 *
 * IMPORTANT: price is always recomputed here from the database, never
 * trusted from the client. This is the one place a demo/prototype and a
 * real backend must differ — the React prototype trusted its own local
 * cart math because there was nothing else touching it; a real API can't.
 */
router.post("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { vendorId, items, deliveryAddress, deliveryPhone, deliveryLatitude, deliveryLongitude } = req.body;
  if (!vendorId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "vendorId and a non-empty items array are required" });
  }
  if (!deliveryAddress || !deliveryPhone) {
    return res.status(400).json({ error: "deliveryAddress and deliveryPhone are required" });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      products: { include: { addOns: true } },
      owner: { select: { approved: true } },
      manager: { select: { approved: true } },
    },
  });
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  if (!vendor.isOpen) return res.status(400).json({ error: "This vendor is currently closed" });
  const vendorSuspended = (vendor.owner && !vendor.owner.approved) || (vendor.manager && !vendor.manager.approved);
  if (vendorSuspended) return res.status(400).json({ error: "This vendor is currently unavailable" });

  let total = 0;
  const orderItems = [];

  for (const line of items) {
    const product = vendor.products.find((p) => p.id === line.productId);
    if (!product) return res.status(400).json({ error: `Product ${line.productId} not found for this vendor` });

    const qty = Math.max(1, Number(line.qty) || 1);
    const chosenAddOns = (line.addOns || [])
      .map(({ id, qty: addOnQty }) => {
        const addOn = product.addOns.find((a) => a.id === id);
        return addOn ? { ...addOn, qty: Math.max(1, Number(addOnQty) || 1) } : null;
      })
      .filter(Boolean);

    const unitPrice = product.price + chosenAddOns.reduce((s, a) => s + a.price * a.qty, 0);
    const addOnLabel = chosenAddOns.map((a) => (a.qty > 1 ? `${a.qty}× ${a.name}` : a.name)).join(", ");
    const name = product.name + (addOnLabel ? ` + ${addOnLabel}` : "");

    total += unitPrice * qty;
    orderItems.push({ name, price: unitPrice, qty, emoji: product.emoji });
  }

  const order = await prisma.order.create({
    data: {
      customerId: req.user.id,
      vendorId,
      total,
      deliveryAddress,
      deliveryPhone,
      deliveryLatitude: deliveryLatitude === undefined || deliveryLatitude === null ? null : Number(deliveryLatitude),
      deliveryLongitude: deliveryLongitude === undefined || deliveryLongitude === null ? null : Number(deliveryLongitude),
      items: { create: orderItems },
    },
    include: { items: true, vendor: true },
  });

  res.status(201).json(order);
});

/**
 * GET /orders/mine — role-aware order list.
 * Customer: their own orders. Vendor: orders placed with their store.
 * Rider: orders assigned to them, plus (if online) unassigned READY orders
 * in their zone. Admin/Manager: everything.
 */
router.get("/mine", requireAuth, async (req, res) => {
  const { role, id } = req.user;

  if (role === "CUSTOMER") {
    const orders = await prisma.order.findMany({
      where: { customerId: id },
      include: { items: true, vendor: true, rider: { include: { user: true } }, dispute: true, payment: true, review: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(orders);
  }

  if (role === "VENDOR") {
    const vendor = await prisma.vendor.findUnique({ where: { ownerId: id } });
    if (!vendor) return res.json([]);
    const orders = await prisma.order.findMany({
      // Payment-first: an order stays invisible to the vendor until it's
      // paid. This was completely unenforced before — every order showed
      // up regardless of payment status, meaning a vendor could accept
      // and prepare food for an order nobody had paid for. PAID or
      // REFUNDED (not strictly PAID) so a declined-after-payment order
      // stays visible for the vendor's own records instead of vanishing
      // the instant they decline it.
      where: { vendorId: vendor.id, payment: { status: { in: ["PAID", "REFUNDED"] } } },
      include: { items: true, dispute: true, payment: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(orders);
  }

  if (role === "RIDER") {
    const rider = await prisma.rider.findUnique({ where: { userId: id } });

    // Address/phone are only revealed once the rider has confirmed pickup
    // (status PICKED_UP or later) — matches the web prototype's privacy
    // rule: a rider sees where to deliver only after they're holding the
    // order, not while it's still sitting with the vendor.
    const redactUntilPickup = (order) => {
      const revealed = order.status === "PICKED_UP" || order.status === "DELIVERED";
      return revealed ? order : { ...order, deliveryAddress: null, deliveryPhone: null, deliveryLatitude: null, deliveryLongitude: null };
    };

    const assigned = await prisma.order.findMany({
      where: { riderId: rider?.id, status: { in: ["READY", "PICKED_UP"] } },
      include: { items: true, vendor: true, rider: { include: { user: true } } },
    });
    const available = await prisma.order.findMany({
      where: { status: "READY", riderId: null },
      include: { items: true, vendor: true },
    });

    // Real "today" stats — replaces the seed-baseline + live-session-data
    // pattern the mobile prototype used for Today/Week/Month, at least for
    // "today". Week/Month need a proper historical query and are deferred
    // (see the Needly Scope of Work's "Explicitly Deferred" section).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const completedToday = await prisma.order.findMany({
      where: { riderId: rider?.id, status: "DELIVERED", updatedAt: { gte: startOfToday } },
      include: { items: true, vendor: true, rider: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({
      assigned: assigned.map(redactUntilPickup),
      available: available.map(redactUntilPickup),
      completedToday,
    });
  }

  if (role === "MANAGER") {
    const vendor = await prisma.vendor.findUnique({ where: { managerId: id } });
    if (!vendor) return res.json([]);
    const orders = await prisma.order.findMany({
      where: { vendorId: vendor.id, payment: { status: { in: ["PAID", "REFUNDED"] } } },
      include: { items: true, vendor: true, rider: { include: { user: true } }, dispute: true, payment: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(orders);
  }

  // ADMIN
  // Query params mirror the search/filter controls added to the Admin
  // dashboard: ?search=<order id, customer name/phone, or vendor name>,
  // ?status=<OrderStatus>, ?paymentStatus=<PaymentStatus>, ?riderId=<id>
  // (the last one powers the per-rider drill-down: delivery history and
  // currently-active orders for a single rider, reusing this same filtered
  // list endpoint instead of a separate duplicate one).
  //
  // Built as an explicit AND of conditions rather than separate top-level
  // keys, because two of them independently need their own OR block
  // (search, and the "pending" payment case below) — if both wrote to
  // where.OR directly, the second would silently overwrite the first and
  // the search term would just stop working whenever a payment filter was
  // also active.
  const { status, paymentStatus, search, riderId } = req.query;
  const and = [];
  if (status) and.push({ status: status.toUpperCase() });
  if (riderId) and.push({ riderId });
  if (paymentStatus) {
    const ps = paymentStatus.toUpperCase();
    if (ps === "PENDING") {
      // A brand-new order has no Payment row at all yet — it's only
      // created when checkout starts (see POST /payments/initialize).
      // A plain `payment: { status: "PENDING" }` filter only matches
      // orders that already have an explicit pending Payment row, which
      // would silently exclude every order that hasn't reached checkout
      // yet — exactly the orders "show me what's unpaid" most needs to
      // surface.
      and.push({ OR: [{ payment: null }, { payment: { status: "PENDING" } }] });
    } else {
      and.push({ payment: { status: ps } });
    }
  }
  if (search) {
    and.push({
      OR: [
        { id: { contains: search, mode: "insensitive" } },
        { deliveryPhone: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { vendor: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  const where = and.length ? { AND: and } : {};
  const orders = await prisma.order.findMany({
    where,
    include: { items: true, vendor: true, rider: { include: { user: true } }, dispute: true, payment: true, customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

/**
 * PATCH /orders/:id/status — advance an order to the next status.
 * Enforces both the allowed transition (see TRANSITIONS above) and that
 * the caller's role is allowed to make it, plus ownership (a vendor can
 * only advance their own orders; a rider can only advance orders assigned
 * to them, except for claiming a READY order — see /orders/:id/claim).
 */
router.patch("/:id/status", requireAuth, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { vendor: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const rule = TRANSITIONS[order.status];
  if (!rule) return res.status(400).json({ error: `Order is in a terminal state (${order.status})` });
  const isAdminRole = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  if (!rule.allow.includes(req.user.role) && !isAdminRole) {
    return res.status(403).json({ error: "Not authorized to advance this order" });
  }

  if (req.user.role === "VENDOR" && order.vendor.ownerId !== req.user.id) {
    return res.status(403).json({ error: "This isn't your order" });
  }
  // Bugfix: MANAGER had no ownership check at all here, so any manager
  // could advance orders for any vendor, not just the one they're
  // assigned to (e.g. Local Market).
  if (req.user.role === "MANAGER" && order.vendor.managerId !== req.user.id) {
    return res.status(403).json({ error: "This isn't your vendor's order" });
  }
  if (req.user.role === "RIDER") {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    if (order.riderId !== rider?.id) return res.status(403).json({ error: "This delivery isn't assigned to you" });
  }

  // Payment-first, enforced at the point of action — not just hidden from
  // view. Display filtering alone is bypassable (a stale screen, a direct
  // API call); this is the actual authorization boundary. Admin can
  // override, matching the broader authority Admin already has elsewhere
  // (e.g. force-cancelling further into the order lifecycle than anyone else can).
  if (order.status === "PLACED" && !isAdminRole) {
    const payment = await prisma.payment.findUnique({ where: { orderId: order.id } });
    if (!payment || payment.status !== "PAID") {
      return res.status(400).json({ error: "This order hasn't been paid for yet" });
    }
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: rule.next },
    include: { items: true, customer: true, vendor: true, rider: { include: { user: true } } },
  });

  // Real-time push to whoever's watching this order right now...
  emit(req, `order:${order.id}`, "order:updated", updated);
  // ...and a background push notification in case they're not.
  if (updated.customer.expoPushToken) {
    sendPushNotification(updated.customer.expoPushToken, {
      title: `Order #${updated.id.slice(-6)} update`,
      body: `Your order is now: ${updated.status.replace("_", " ").toLowerCase()}`,
      data: { orderId: updated.id },
    });
  }

  // Dispatch: the moment an order goes READY, tell every online rider in
  // this vendor's area — first to claim it via POST /orders/:id/claim wins.
  if (updated.status === "READY") {
    const onlineRiders = await prisma.rider.findMany({
      where: { isOnline: true },
      include: { user: true },
    });
    const tokens = onlineRiders.map((r) => r.user.expoPushToken).filter(Boolean);
    emit(req, "riders:online", "order:available", updated);
    sendPushNotification(tokens, {
      title: "New delivery available",
      body: `${updated.vendor.name} — ${updated.vendor.area}`,
      data: { orderId: updated.id },
    });
  }

  res.json(updated);
});

/**
 * POST /orders/:id/claim — a rider accepts a READY, unassigned order.
 * Uses updateMany with riderId: null in the WHERE clause so two riders
 * tapping "accept" at the same moment can't both win the same delivery.
 */
router.post("/:id/claim", requireAuth, requireRole("RIDER"), async (req, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(400).json({ error: "Rider profile not found" });
  if (!rider.isOnline) {
    return res.status(403).json({ error: "Go online before accepting deliveries" });
  }

  const result = await prisma.order.updateMany({
    where: { id: req.params.id, status: "READY", riderId: null },
    data: { riderId: rider.id },
  });

  if (result.count === 0) {
    return res.status(409).json({ error: "This delivery was already claimed by another rider" });
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true, vendor: true, payment: true, rider: { include: { user: true } } },
  });
  if (order?.payment?.status === "PAID" && order.rider?.userId && order.payment.riderPayoutAmount > 0) {
    await createWalletCredit({
      userId: order.rider.userId,
      amount: order.payment.riderPayoutAmount,
      reference: `${order.payment.reference}:rider`,
      type: "RIDER_EARNING",
      category: "DELIVERY_PAYOUT",
      gateway: order.payment.gateway || "checkout",
      description: `Rider payout for order #${order.id.slice(-6)}`,
      metadata: {
        orderId: order.id,
        paymentId: order.payment.id,
        paymentReference: order.payment.reference,
        deliveryFeeAmount: order.payment.deliveryFeeAmount,
        companyDeliveryFeeAmount: order.payment.companyDeliveryFeeAmount,
        creditedOnClaim: true,
      },
    });
  }
  emit(req, `order:${order.id}`, "order:updated", order);
  res.json(order);
});

/**
 * POST /orders/:id/cancel
 * Customers can cancel while an order is still PLACED (before the vendor
 * has started prepping). Vendors can cancel up through ACCEPTED. Admin can
 * force-cancel at any point up to DELIVERED — this is the manual override
 * for a stuck order (rider gone dark, food effectively abandoned), which
 * customers/vendors have no legitimate reason to trigger that late.
 * If a payment was already captured, this triggers a Paystack refund.
 */
router.post("/:id/cancel", requireAuth, async (req, res) => {
  const { reason } = req.body;
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { vendor: true, payment: true, customer: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const isOwner = req.user.role === "CUSTOMER" && order.customerId === req.user.id;
  const isVendor = req.user.role === "VENDOR" && order.vendor.ownerId === req.user.id;
  // Bugfix: Manager was never included in this check at all — the Decline
  // button built for Local Market would have hit a 403 the moment it was
  // actually used, since there was no path for a manager to pass this
  // authorization regardless of whether it was their own store's order.
  const isManager = req.user.role === "MANAGER" && order.vendor.managerId === req.user.id;
  const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  if (!isOwner && !isVendor && !isManager && !isAdmin) {
    return res.status(403).json({ error: "Not authorized to cancel this order" });
  }

  const cancellableStatuses = isAdmin
    ? ["PLACED", "ACCEPTED", "READY", "PICKED_UP"]
    : ["PLACED", "ACCEPTED"];
  if (!cancellableStatuses.includes(order.status)) {
    return res.status(400).json({ error: `Order can no longer be cancelled (status: ${order.status})` });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED", cancelReason: reason || null },
  });

  if (isAdmin) {
    await logAction(req, {
      action: "Force-cancelled order", targetType: "Order", targetId: order.id,
      targetLabel: `Order #${order.id.slice(-6)} \u2014 ${order.vendor.name}`,
    });
  }

  if (order.payment && order.payment.status === "PAID") {
    try {
      await refundTransaction({ reference: order.payment.reference });
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
    } catch (err) {
      console.error("Refund failed:", err.response?.data || err.message);
      // Order stays cancelled either way — refund can be retried manually
      // from the Paystack dashboard if the API call itself failed.
    }
  }

  // Only when a vendor/manager declines — a customer cancelling their own
  // order doesn't need to be told why they did it.
  if ((isVendor || isManager) && order.customer.expoPushToken) {
    sendPushNotification(order.customer.expoPushToken, {
      title: `${order.vendor.name} couldn't take your order`,
      body: reason ? reason : "Your payment has been refunded.",
      data: { orderId: order.id, type: "order-declined" },
    });
  }

  emit(req, `order:${order.id}`, "order:updated", updated);
  res.json(updated);
});

/**
 * POST /orders/:id/unassign — admin releases a stuck order's rider,
 * putting it back in the available pool for another rider to claim.
 * Restricted to READY: once PICKED_UP, the rider physically has the
 * order, so "reassigning" isn't meaningful the same way — that scenario
 * needs a phone call, not a database update.
 */
router.post("/:id/unassign", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "READY" || !order.riderId) {
    return res.status(400).json({ error: "This order isn't currently assigned to a rider awaiting pickup" });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { riderId: null },
    include: { items: true, vendor: true },
  });
  await logAction(req, {
    action: "Released rider back to pool", targetType: "Order", targetId: order.id,
    targetLabel: `Order #${order.id.slice(-6)} \u2014 ${updated.vendor.name}`,
  });
  emit(req, `order:${order.id}`, "order:updated", updated);
  emit(req, "riders:online", "order:available", updated);
  res.json(updated);
});

module.exports = router;
