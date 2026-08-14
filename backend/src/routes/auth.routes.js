const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

const router = express.Router();

// Closes the "no rate limiting on auth endpoints" gap the README flagged
// as a pre-launch requirement. 10 attempts per 15 minutes per IP is
// generous for a real user, tight enough to blunt brute-forcing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * POST /auth/register
 * body: { name, email, phone, password, role }
 *
 * CUSTOMER, MANAGER, and ADMIN accounts are approved immediately.
 * VENDOR and RIDER self-registrations land in a pending state — they
 * can create an account but can't log in until an admin approves them
 * via PATCH /auth/users/:id/approve. This closes the "anyone can
 * self-register as a vendor or rider" gap the README used to flag.
 */
router.post("/register", authLimiter, async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, and role are required" });
  }
  if (!["CUSTOMER", "VENDOR", "RIDER", "MANAGER", "ADMIN"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const needsApproval = role === "VENDOR" || role === "RIDER";
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, role, approved: !needsApproval },
  });

  if (needsApproval) {
    return res.status(201).json({
      pendingApproval: true,
      message: "Account created. A Route admin needs to approve your account before you can log in.",
    });
  }

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/**
 * POST /auth/login
 * body: { email, password }
 */
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  if (!user.approved) {
    if (user.suspendedAt) {
      return res.status(403).json({ error: "Your account has been suspended. Contact support if you believe this is a mistake." });
    }
    return res.status(403).json({ error: "Your account is pending admin approval" });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/** GET /auth/me — returns the logged-in user's profile. */
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { vendor: true, managedVendor: true, rider: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

/** GET /auth/pending — admin-only list of vendor/rider accounts awaiting approval. */
router.get("/pending", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const pending = await prisma.user.findMany({
    where: { approved: false, role: { in: ["VENDOR", "RIDER"] } },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(pending);
});

/** PATCH /auth/users/:id/approve — admin approves a pending vendor/rider account. */
router.patch("/users/:id/approve", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { approved: true, suspendedAt: null },
  });
  await logAction(req, { action: "Approved account", targetType: user.role === "RIDER" ? "Rider" : "Vendor", targetId: user.id, targetLabel: user.name });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

/**
 * PATCH /auth/users/:id/suspend — admin revokes an already-approved
 * vendor/rider account. Reuses the same `approved` flag that gates login,
 * so a suspended account is locked out immediately, the same way it would
 * have been if it had never been approved in the first place.
 */
router.patch("/users/:id/suspend", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { approved: false, suspendedAt: new Date() },
  });
  // If this account is a rider, force them offline too — matches the app
  // prototype's behavior, and avoids the roster showing a suspended rider
  // as still "online" just because their last known state hadn't changed.
  if (user.role === "RIDER") {
    await prisma.rider.updateMany({ where: { userId: user.id }, data: { isOnline: false } });
  }
  await logAction(req, { action: "Suspended account", targetType: user.role === "RIDER" ? "Rider" : "Vendor", targetId: user.id, targetLabel: user.name });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

/** PATCH /auth/me/push-token — saves the device's Expo push token. */
router.patch("/me/push-token", requireAuth, async (req, res) => {
  const { expoPushToken } = req.body;
  if (!expoPushToken) return res.status(400).json({ error: "expoPushToken is required" });

  await prisma.user.update({
    where: { id: req.user.id },
    data: { expoPushToken },
  });
  res.json({ ok: true });
});

/**
 * PATCH /auth/users/:id/contact — admin edits a person's name/phone.
 * Deliberately generic rather than duplicated per-role: a rider's name
 * and a vendor owner's name are both just User fields underneath, so one
 * endpoint handles "fix a typo in this rider's phone number" and "fix a
 * typo in this vendor owner's phone number" the same way.
 */
router.patch("/users/:id/contact", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, phone } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (Object.keys(data).length === 0) return res.status(400).json({ error: "Provide name and/or phone to update" });

  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  await logAction(req, { action: "Edited contact info", targetType: "User", targetId: user.id, targetLabel: user.name });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
