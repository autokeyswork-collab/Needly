const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { getJwtSecret } = require("../lib/jwtSecret");

/**
 * Verifies the JWT on every protected route and attaches `req.user`.
 * Also re-checks `approved` against the database on every request — the
 * JWT payload alone isn't enough, because it's frozen at login time. Without
 * this, an admin suspending a vendor/rider would have no effect on anyone
 * already holding a valid token; they'd keep full access until it expired.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { approved: true } });
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    if (!user.approved) return res.status(403).json({ error: "Your account has been suspended" });
    req.user = payload; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Restricts a route to specific roles. SUPER_ADMIN always has access. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: "Not authorized for this action" });
    if (req.user.role === "SUPER_ADMIN" || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: "Not authorized for this action" });
  };
}

/** Restricts a route to users with a specific permission. SUPER_ADMIN bypasses. */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: "Not authorized for this action" });
    if (req.user.role === "SUPER_ADMIN") return next();

    try {
      const userRoleObjs = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      });

      const hasPerm = userRoleObjs.some((ur) =>
        ur.role.rolePermissions.some((rp) => rp.permission.code === permissionCode)
      );

      if (hasPerm) return next();
    } catch (e) {
      /* fallback */
    }

    return res.status(403).json({ error: `Missing required permission: ${permissionCode}` });
  };
}

module.exports = { requireAuth, requireRole, requirePermission };
