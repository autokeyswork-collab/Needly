const prisma = require("./prisma");

/**
 * Records one audit log entry. Fire-and-forget from the caller's
 * perspective — actorName is looked up fresh each time rather than trusted
 * from the JWT payload, since a display name shouldn't go stale between
 * login and action.
 */
async function logAction(req, { action, targetType, targetId, targetLabel }) {
  const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      actorName: actor?.name || "Unknown",
      action,
      targetType,
      targetId: targetId || null,
      targetLabel,
    },
  });
}

module.exports = { logAction };
