const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/hubs", requireAuth, async (_req, res) => {
  const hubs = await prisma.hub.findMany({
    where: { active: true },
    orderBy: [{ area: "asc" }, { name: "asc" }],
  });
  res.json(hubs);
});

router.get("/me", requireAuth, requireRole("AGENT"), async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { userId: req.user.id },
    include: { user: true, hub: true },
  });
  if (!agent) return res.status(404).json({ error: "Agent profile not found" });
  res.json(agent);
});

router.patch("/me/online", requireAuth, requireRole("AGENT"), async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { userId: req.user.id } });
  if (!agent) return res.status(404).json({ error: "Agent profile not found" });

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { isOnline: !agent.isOnline },
    include: { hub: true },
  });
  res.json(updated);
});

router.get("/me/stats", requireAuth, requireRole("AGENT"), async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { userId: req.user.id } });
  if (!agent) return res.status(404).json({ error: "Agent profile not found" });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [assigned, collecting, deliveredToHubToday, waitingAtHub] = await Promise.all([
    prisma.order.count({ where: { agentId: agent.id, agentPickupStatus: "ASSIGNED" } }),
    prisma.order.count({ where: { agentId: agent.id, agentPickupStatus: "COLLECTING" } }),
    prisma.order.count({ where: { agentId: agent.id, agentPickupStatus: "AT_HUB", hubReceivedAt: { gte: todayStart } } }),
    prisma.order.count({ where: { hubId: agent.hubId || undefined, fulfillmentType: "AGENT_HUB", agentPickupStatus: "AT_HUB", riderId: null, status: "READY" } }),
  ]);

  res.json({
    assigned,
    collecting,
    deliveredToHubToday,
    waitingAtHub,
    isOnline: agent.isOnline,
  });
});

module.exports = router;
