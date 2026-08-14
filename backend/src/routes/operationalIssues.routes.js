const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");
const { sendPushNotification } = require("../lib/pushNotifications");

const router = express.Router();

/**
 * POST /operational-issues — any authenticated role can report one (a
 * customer's "Need help" flow, a rider's "Report a problem" flow, etc).
 * Unlike disputes, not restricted to CUSTOMER — a rider reporting "can't
 * reach the customer" is exactly this kind of issue too.
 */
router.post("/", requireAuth, async (req, res) => {
  const { reason, orderId } = req.body;
  if (!reason) return res.status(400).json({ error: "reason is required" });
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "Order not found" });
  }

  const issue = await prisma.operationalIssue.create({
    data: { reason, orderId: orderId || null, reporterId: req.user.id, reporterRole: req.user.role },
  });

  // Same reasoning as the dispute alert: this is the one piece of
  // real-time alerting worth its complexity at pilot scale — an issue
  // sitting unseen is a bad outcome regardless of who reported it.
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", expoPushToken: { not: null } },
    select: { expoPushToken: true },
  });
  const tokens = admins.map((a) => a.expoPushToken).filter(Boolean);
  if (tokens.length) {
    sendPushNotification(tokens, {
      title: "New operational issue reported",
      body: reason,
      data: { type: "operational-issue", issueId: issue.id, orderId: orderId || null },
    });
  }

  res.status(201).json(issue);
});

/**
 * GET /operational-issues — admin-only, every reported issue with reporter
 * + order info. Includes the customer's name/phone and the order's
 * delivery address/phone directly — when a rider reports "can't reach
 * the customer" or "can't find the address," that's exactly the
 * information Admin needs to actually do something about it, not a
 * separate lookup they have to go run themselves.
 *
 * customer uses an explicit select (name, phone only), never a blanket
 * include — Prisma's default include on a relation returns every scalar
 * field of that model, which for User would mean passwordHash leaking
 * straight into this API response. That's not hypothetical carelessness
 * to guard against here, it's the literal default behavior.
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const issues = await prisma.operationalIssue.findMany({
    include: {
      reporter: { select: { id: true, name: true, role: true } },
      order: {
        include: {
          vendor: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(issues);
});

/** PATCH /operational-issues/:id/resolve — admin closes it. */
router.patch("/:id/resolve", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const issue = await prisma.operationalIssue.update({
    where: { id: req.params.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
    include: { reporter: { select: { name: true } } },
  });
  await logAction(req, {
    action: "Resolved operational issue", targetType: "OperationalIssue", targetId: issue.id,
    targetLabel: `${issue.reporter.name} \u2014 ${issue.reason}`,
  });
  res.json(issue);
});

module.exports = router;
