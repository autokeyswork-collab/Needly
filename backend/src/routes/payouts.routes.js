const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

const router = express.Router();

/** GET /payouts — admin-only, every withdrawal request with rider contact info. */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { status } = req.query;
  const payouts = await prisma.payout.findMany({
    where: status ? { status: status.toUpperCase() } : undefined,
    include: { rider: { include: { user: { select: { name: true, phone: true } } } } },
    orderBy: { requestedAt: "desc" },
  });
  res.json(payouts);
});

/**
 * PATCH /payouts/:id/mark-paid — admin confirms the money has actually
 * been sent (via Paystack's dashboard, bank transfer, or any other means
 * — see the Payout model for why this is a manual confirmation rather
 * than an automatic transfer). Optional note for a transfer reference.
 */
router.patch("/:id/mark-paid", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const payout = await prisma.payout.findUnique({ where: { id: req.params.id }, include: { rider: { include: { user: true } } } });
  if (!payout) return res.status(404).json({ error: "Payout not found" });
  if (payout.status !== "PENDING") return res.status(400).json({ error: `Payout is already ${payout.status.toLowerCase()}` });

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { status: "PAID", processedAt: new Date(), note: req.body.note || null },
  });
  await logAction(req, {
    action: "Marked payout paid", targetType: "Payout", targetId: payout.id,
    targetLabel: `${payout.rider.user.name} \u2014 \u20A6${payout.amount.toLocaleString()}`,
  });
  res.json(updated);
});

/**
 * PATCH /payouts/:id/reject — admin declines a withdrawal request (e.g.
 * bank details look wrong). The requested amount simply falls out of the
 * balance calculation once no longer PENDING, so it's automatically
 * available for the rider to request again — no separate "refund the
 * balance" step needed.
 */
router.patch("/:id/reject", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const payout = await prisma.payout.findUnique({ where: { id: req.params.id }, include: { rider: { include: { user: true } } } });
  if (!payout) return res.status(404).json({ error: "Payout not found" });
  if (payout.status !== "PENDING") return res.status(400).json({ error: `Payout is already ${payout.status.toLowerCase()}` });

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { status: "REJECTED", processedAt: new Date(), note: req.body.note || null },
  });
  await logAction(req, {
    action: "Rejected payout", targetType: "Payout", targetId: payout.id,
    targetLabel: `${payout.rider.user.name} \u2014 \u20A6${payout.amount.toLocaleString()}`,
  });
  res.json(updated);
});

module.exports = router;
