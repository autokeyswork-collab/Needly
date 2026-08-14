const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/** GET /audit-log — admin-only, most recent first. */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json(entries);
});

module.exports = router;
