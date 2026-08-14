const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

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
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { approved: true } });
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    if (!user.approved) return res.status(403).json({ error: "Your account has been suspended" });
    req.user = payload; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Restricts a route to specific roles. Use after requireAuth. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorized for this action" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
