const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  res.json(notifications);
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const updated = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { read: true },
  });
  res.json({ ok: true, count: updated.count });
});

router.patch("/read-all", requireAuth, async (req, res) => {
  const updated = await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true },
  });
  res.json({ ok: true, count: updated.count });
});

module.exports = router;
