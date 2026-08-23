const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

const router = express.Router();
const RIDER_PAYOUT = Number(process.env.RIDER_PAYOUT_PER_DELIVERY || 600);

function orderRiderPayout(order) {
  const payment = order?.payment;
  if (payment?.riderPayoutAmount) return payment.riderPayoutAmount;
  if (payment?.deliveryFeeAmount) return Math.max(0, payment.deliveryFeeAmount - Math.round(payment.deliveryFeeAmount * 0.05));
  return RIDER_PAYOUT;
}

/**
 * GET /riders — admin-only roster. Nothing like this existed before this
 * pass: every other route in this file is scoped to "me" (the logged-in
 * rider). Admin had no way to see who its riders even are.
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const riders = await prisma.rider.findMany({
    include: { user: { select: { id: true, name: true, email: true, phone: true, approved: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(riders);
});

/** PATCH /riders/me/online — toggle availability for new deliveries. */
router.patch("/me/online", requireAuth, requireRole("RIDER"), async (req, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(404).json({ error: "Rider profile not found" });

  const updated = await prisma.rider.update({
    where: { id: rider.id },
    data: { isOnline: !rider.isOnline },
  });
  res.json(updated);
});

/**
 * GET /riders/me/deliveries?period=today|week|month — the actual
 * delivered orders behind a period's aggregate number, not just the
 * count+sum /me/stats returns. Matters the moment a rider wants to check
 * "which 12 deliveries" made up this week's ₦7,200, not just trust the total.
 */
router.get("/me/deliveries", requireAuth, requireRole("RIDER"), async (req, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(404).json({ error: "Rider profile not found" });

  const period = req.query.period || "week";
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let since;
  if (period === "today") {
    since = startOfDay;
  } else if (period === "month") {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    since = new Date(startOfDay);
    since.setDate(startOfDay.getDate() - startOfDay.getDay()); // Sunday start, matches /me/stats
  }

  const deliveries = await prisma.order.findMany({
    where: { riderId: rider.id, status: "DELIVERED", updatedAt: { gte: since } },
    include: { vendor: { select: { name: true, emoji: true } }, payment: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json(deliveries.map((o) => ({
    id: o.id, vendorName: o.vendor.name, vendorEmoji: o.vendor.emoji, total: o.total,
    deliveredAt: o.updatedAt, payout: orderRiderPayout(o),
  })));
});

/**
 * GET /riders/me/stats — today / this week / this month completed
 * deliveries and earnings, computed from real delivered orders.
 * (This replaces the mock seed data used in the prototype.)
 */
router.get("/me/stats", requireAuth, requireRole("RIDER"), async (req, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(404).json({ error: "Rider profile not found" });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Sunday start
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const ordersSince = async (since) =>
    prisma.order.findMany({
      where: { riderId: rider.id, status: "DELIVERED", updatedAt: { gte: since } },
      include: { payment: true },
    });

  const [todayOrders, weekOrders, monthOrders] = await Promise.all([
    ordersSince(startOfDay),
    ordersSince(startOfWeek),
    ordersSince(startOfMonth),
  ]);
  const sumPayouts = (orders) => orders.reduce((sum, order) => sum + orderRiderPayout(order), 0);

  res.json({
    today: { completed: todayOrders.length, earnings: sumPayouts(todayOrders) },
    week: { completed: weekOrders.length, earnings: sumPayouts(weekOrders) },
    month: { completed: monthOrders.length, earnings: sumPayouts(monthOrders) },
    rating: rider.rating,
    isOnline: rider.isOnline,
  });
});

/**
 * Computes a rider's available balance: everything they've ever earned
 * from delivered orders, minus payouts already paid, minus payouts
 * currently pending (that money is spoken for the moment it's requested,
 * so it can't be requested a second time while the first request is
 * still awaiting admin action).
 */
async function computeBalance(riderId) {
  const [deliveredOrders, paidAgg, pendingAgg] = await Promise.all([
    prisma.order.findMany({ where: { riderId, status: "DELIVERED" }, include: { payment: true } }),
    prisma.payout.aggregate({ where: { riderId, status: "PAID" }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { riderId, status: "PENDING" }, _sum: { amount: true } }),
  ]);
  const totalEarned = deliveredOrders.reduce((sum, order) => sum + orderRiderPayout(order), 0);
  const totalPaidOut = paidAgg._sum.amount || 0;
  const totalPending = pendingAgg._sum.amount || 0;
  return { totalEarned, totalPaidOut, totalPending, available: totalEarned - totalPaidOut - totalPending };
}

/** PATCH /riders/me/bank-account — set or update payout destination. */
router.patch("/me/bank-account", requireAuth, requireRole("RIDER"), async (req, res) => {
  const { bankName, bankAccountNumber, bankAccountName } = req.body;
  if (!bankName || !bankAccountNumber || !bankAccountName) {
    return res.status(400).json({ error: "bankName, bankAccountNumber, and bankAccountName are all required" });
  }
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(404).json({ error: "Rider profile not found" });

  const updated = await prisma.rider.update({
    where: { id: rider.id },
    data: { bankName, bankAccountNumber, bankAccountName },
  });
  res.json(updated);
});

/** GET /riders/me/balance — available balance, ready to request as a withdrawal. */
router.get("/me/balance", requireAuth, requireRole("RIDER"), async (req, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(404).json({ error: "Rider profile not found" });
  res.json(await computeBalance(rider.id));
});

/** GET /riders/me/payouts — this rider's own withdrawal history. */
router.get("/me/payouts", requireAuth, requireRole("RIDER"), async (req, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(404).json({ error: "Rider profile not found" });
  const payouts = await prisma.payout.findMany({ where: { riderId: rider.id }, orderBy: { requestedAt: "desc" } });
  res.json(payouts);
});

/**
 * POST /riders/me/payouts — request a withdrawal. Creates a PENDING
 * record for admin to review and mark paid — see the note on the Payout
 * model for why this isn't an automatic bank transfer.
 */
router.post("/me/payouts", requireAuth, requireRole("RIDER"), async (req, res) => {
  const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
  if (!rider) return res.status(404).json({ error: "Rider profile not found" });
  if (!rider.bankAccountNumber) {
    return res.status(400).json({ error: "Add your bank account details before requesting a withdrawal" });
  }

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: "A positive amount is required" });

  const balance = await computeBalance(rider.id);
  if (amount > balance.available) {
    return res.status(400).json({ error: `Amount exceeds your available balance of \u20A6${balance.available.toLocaleString()}` });
  }

  const payout = await prisma.payout.create({ data: { riderId: rider.id, amount } });
  res.status(201).json(payout);
});

/**
 * PATCH /riders/:id/admin-edit — admin edits rider-specific fields
 * (name/phone go through PATCH /auth/users/:id/contact instead, since
 * those are User fields, not Rider fields).
 */
router.patch("/:id/admin-edit", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { zone } = req.body;
  if (zone === undefined) return res.status(400).json({ error: "No fields to update" });

  const rider = await prisma.rider.update({
    where: { id: req.params.id }, data: { zone },
    include: { user: { select: { name: true } } },
  });
  await logAction(req, { action: "Edited rider profile", targetType: "Rider", targetId: rider.id, targetLabel: rider.user.name });
  res.json(rider);
});

/**
 * PATCH /riders/:id/verification — admin records what was checked (see
 * the schema note on Rider.verified for why this isn't a document
 * upload).
 */
router.patch("/:id/verification", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { idType, idNumber, verified, verificationNotes } = req.body;
  const data = {};
  if (idType !== undefined) data.idType = idType;
  if (idNumber !== undefined) data.idNumber = idNumber;
  if (verificationNotes !== undefined) data.verificationNotes = verificationNotes;
  if (verified !== undefined) {
    data.verified = !!verified;
    data.verifiedAt = verified ? new Date() : null;
  }

  const rider = await prisma.rider.update({
    where: { id: req.params.id }, data,
    include: { user: { select: { name: true } } },
  });
  await logAction(req, {
    action: verified ? "Verified rider" : "Updated rider verification", targetType: "Rider", targetId: rider.id, targetLabel: rider.user.name,
  });
  res.json(rider);
});

module.exports = router;
