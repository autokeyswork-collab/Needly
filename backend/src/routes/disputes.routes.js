const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");
const { sendPushNotification } = require("../lib/pushNotifications");

const router = express.Router();

/** POST /disputes — customer reports an issue on a delivered order. */
router.post("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { orderId, reason } = req.body;
  if (!orderId || !reason) return res.status(400).json({ error: "orderId and reason are required" });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { vendor: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.customerId !== req.user.id) return res.status(403).json({ error: "Not your order" });
  if (order.status !== "DELIVERED") return res.status(400).json({ error: "Can only dispute delivered orders" });

  const dispute = await prisma.dispute.create({
    data: { orderId, vendorId: order.vendorId, reason },
  });

  // Notify every admin with a registered device — this is the one piece of
  // real-time alerting that earns its complexity at pilot scale: everything
  // else (badges, escalation timers, live-refreshing views) can wait until
  // there's enough volume to justify it, but a new dispute sitting unseen
  // for hours is a bad customer outcome regardless of scale.
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", expoPushToken: { not: null } },
    select: { expoPushToken: true },
  });
  const tokens = admins.map((a) => a.expoPushToken).filter(Boolean);
  if (tokens.length) {
    sendPushNotification(tokens, {
      title: "New dispute reported",
      body: `${order.vendor.name} \u2014 ${reason}`,
      data: { type: "dispute", disputeId: dispute.id, orderId: order.id },
    });
  }

  res.status(201).json(dispute);
});

/** GET /disputes — role-aware: vendor/manager see their own store's, admin sees all. */
router.get("/", requireAuth, requireRole("VENDOR", "ADMIN", "MANAGER"), async (req, res) => {
  if (req.user.role === "VENDOR" || req.user.role === "MANAGER") {
    const vendor = req.user.role === "VENDOR"
      ? await prisma.vendor.findUnique({ where: { ownerId: req.user.id } })
      : await prisma.vendor.findUnique({ where: { managerId: req.user.id } });
    if (!vendor) return res.json([]);
    const disputes = await prisma.dispute.findMany({
      where: { vendorId: vendor.id },
      include: { order: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(disputes);
  }

  // ADMIN — needs everything relevant to actually resolving a dispute:
  // items (a "wrong item" claim needs the item list), customer (to follow
  // up), and rider (a "arrived late" complaint is about the rider, not
  // the vendor — previously nowhere in the dispute view showed who
  // delivered it at all). Explicit select on customer/rider.user, never
  // a blanket include — Prisma's default include on a User relation
  // returns every scalar field, including passwordHash.
  const disputes = await prisma.dispute.findMany({
    include: {
      order: {
        include: {
          items: true,
          customer: { select: { id: true, name: true, phone: true } },
          rider: { include: { user: { select: { id: true, name: true, phone: true } } } },
        },
      },
      vendor: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(disputes);
});

/** PATCH /disputes/:id/resolve — admin closes a dispute. */
router.patch("/:id/resolve", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const dispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
    include: { vendor: true },
  });
  await logAction(req, {
    action: "Resolved dispute", targetType: "Dispute", targetId: dispute.id,
    targetLabel: `Order #${dispute.orderId.slice(-6)} \u2014 ${dispute.vendor.name}`,
  });
  res.json(dispute);
});

module.exports = router;
