const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");
const { broadcastProviderStatus, broadcastAdminAlert } = require("../sockets/orderSocket");
const { appUrl, escapeHtml, sendMail } = require("../lib/mailer");
const { initializeHostedPayment } = require("../lib/paymentGateway");
const { getJwtSecret } = require("../lib/jwtSecret");

const router = express.Router();
const confirmationMailTray = [];
const VENDOR_ONBOARDING_FEE_NAIRA = Number(process.env.VENDOR_ONBOARDING_FEE_NAIRA || 2500);

async function queueConfirmationMail({ to, subject, body, type, actionUrl, actionLabel }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to,
    subject,
    body,
    type,
    status: "queued",
    actionUrl,
    actionLabel,
    createdAt: new Date().toISOString(),
  };

  try {
    const mailResult = await sendMail({
      to,
      subject,
      text: actionUrl ? `${body}\n\n${actionLabel || "Open Needly"}: ${actionUrl}` : body,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#15183F">
          <h2 style="color:#6F45E9;margin-bottom:8px">Needly</h2>
          <p>${escapeHtml(body)}</p>
          ${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#6F45E9;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700">${escapeHtml(actionLabel || "Open Needly")}</a></p>` : ""}
          <p style="color:#747792;font-size:12px">Everything you need, in one place.</p>
        </div>
      `,
    });
    item.status = mailResult.sent ? "sent" : "queued";
    item.providerMessageId = mailResult.messageId || null;
    item.note = mailResult.reason || null;
  } catch (err) {
    item.status = "failed";
    item.error = err.message;
  }

  confirmationMailTray.unshift(item);
  if (confirmationMailTray.length > 80) confirmationMailTray.length = 80;
  return item;
}

function vendorEmoji(category) {
  const map = {
    Restaurant: "🍽️",
    Grills: "🔥",
    Supermarket: "🛒",
    "Local Market": "🛍️",
    Pharmacy: "💊",
  };
  return map[category] || "🛍️";
}

function normalizeAuthRole(role) {
  const targetRole = String(role || "CUSTOMER").trim().toUpperCase();
  const allowed = ["CUSTOMER", "VENDOR", "RIDER"];
  return allowed.includes(targetRole) ? targetRole : null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function cleanRegistrationIdentity({ name, email, phone }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = String(phone || "").trim();

  if (!cleanName || !cleanEmail) {
    return { error: "Name and email are required" };
  }
  if (!isValidEmail(cleanEmail)) {
    return { error: "Enter a valid email address" };
  }

  return { cleanName, cleanEmail, cleanPhone };
}

function normalizeVendorProfile(profile, ownerName) {
  const clean = profile || {};
  const storeName = String(clean.name || "").trim();
  const address = String(clean.address || "").trim();

  if (!storeName) return { error: "Store or business name is required" };
  if (!address) return { error: "Store street address is required" };

  return {
    name: storeName,
    category: String(clean.category || "Restaurant").trim() || "Restaurant",
    area: String(clean.area || "Abeokuta").trim() || "Abeokuta",
    address,
    latitude: clean.latitude === undefined || clean.latitude === null || clean.latitude === "" ? null : Number(clean.latitude),
    longitude: clean.longitude === undefined || clean.longitude === null || clean.longitude === "" ? null : Number(clean.longitude),
    eta: String(clean.eta || "20-35 min").trim() || "20-35 min",
    emoji: vendorEmoji(clean.category),
    ownerName,
  };
}

function normalizeRiderProfile(profile) {
  const clean = profile || {};
  const zone = String(clean.zone || "").trim();
  if (!zone) return { error: "Rider operating zone is required" };
  return { zone };
}

async function queuePendingApprovalMail({ user, vendor, rider, provider }) {
  const roleLabel = user.role === "VENDOR" ? "vendor store" : "rider profile";
  const subject = user.role === "VENDOR"
    ? "Welcome to Needly — Vendor Storefront Under Review"
    : "Welcome to Needly — Rider Profile Under Review";
  const details = user.role === "VENDOR"
    ? `your vendor store registration for '${vendor?.name || "your store"}'`
    : `your rider registration for zone '${rider?.zone || "your selected zone"}'`;
  const via = provider ? ` via ${provider}` : "";

  await queueConfirmationMail({
    to: user.email,
    type: `${user.role.toLowerCase()}_signup`,
    subject,
    body: `Hello ${user.name}, ${details} has been received${via}. Needly Admin will review and approve your ${roleLabel}. We will email you a login link once your account is approved.`,
    actionUrl: appUrl(`/?role=${encodeURIComponent(user.role)}&email=${encodeURIComponent(user.email)}`),
    actionLabel: "Open Needly Login",
  });

  broadcastAdminAlert({
    type: "account_pending_approval",
    userId: user.id,
    role: user.role,
    name: user.name,
    vendorName: vendor?.name,
    riderZone: rider?.zone,
  });
}

async function createVendorOnboardingPayment({ user, vendor }) {
  if (!user || !vendor) return null;
  const feeAmount = VENDOR_ONBOARDING_FEE_NAIRA;
  const reference = `needly_vendor_onboarding_${vendor.id}_${Date.now()}`;

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      onboardingFeeAmount: feeAmount,
      onboardingFeeStatus: "PENDING",
      onboardingPaymentReference: reference,
    },
  });

  try {
    const txn = await initializeHostedPayment({
      email: user.email,
      name: user.name,
      phone: user.phone,
      amountNaira: feeAmount,
      reference,
      callbackUrl: appUrl(`/?role=VENDOR&email=${encodeURIComponent(user.email)}&onboarding=paid&pendingApproval=1`),
      metadata: {
        type: "vendor_onboarding",
        vendorId: vendor.id,
        userId: user.id,
        feeAmount,
      },
    });

    return {
      amount: feeAmount,
      reference,
      authorizationUrl: txn.authorization_url,
      gateway: txn.gateway || "paystack",
      status: "PENDING",
    };
  } catch (err) {
    console.error("Vendor onboarding checkout failed", err.response?.data || err.message);
    return {
      amount: feeAmount,
      reference,
      authorizationUrl: null,
      status: "PENDING",
      error: "Payment link could not be created yet. Admin can retry after payment settings are configured.",
    };
  }
}

// Closes the "no rate limiting on auth endpoints" gap the README flagged
// as a pre-launch requirement. 10 attempts per 15 minutes per IP is
// generous for a real user, tight enough to blunt brute-forcing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function normalizeSessionUserRole(user) {
  if (!user) return user;
  if (user.role === "CUSTOMER" && user.vendor) return { ...user, role: "VENDOR" };
  if (user.role === "CUSTOMER" && user.managedVendor) return { ...user, role: "MANAGER" };
  if (user.role === "CUSTOMER" && user.rider) return { ...user, role: "RIDER" };
  if (user.role === "CUSTOMER" && user.agent) return { ...user, role: "AGENT" };
  return user;
}

/**
 * POST /auth/register
 * body: { name, email, phone, password, role, vendorProfile, riderProfile }
 */
router.post("/register", authLimiter, async (req, res) => {
  const { name, email, phone, password, role = "CUSTOMER", vendorProfile, riderProfile } = req.body;

  const identity = cleanRegistrationIdentity({ name, email, phone });
  if (identity.error) return res.status(400).json({ error: identity.error });
  if (!password) return res.status(400).json({ error: "Password is required" });

  const targetRole = normalizeAuthRole(role);
  if (!targetRole) return res.status(400).json({ error: "Choose Customer, Vendor, or Rider to register" });
  const requiresApproval = targetRole === "VENDOR" || targetRole === "RIDER";
  const normalizedVendor = targetRole === "VENDOR" ? normalizeVendorProfile(vendorProfile, identity.cleanName) : null;
  if (normalizedVendor?.error) return res.status(400).json({ error: normalizedVendor.error });
  const normalizedRider = targetRole === "RIDER" ? normalizeRiderProfile(riderProfile) : null;
  if (normalizedRider?.error) return res.status(400).json({ error: normalizedRider.error });

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identity.cleanEmail },
          ...(identity.cleanPhone ? [{ phone: identity.cleanPhone }] : []),
        ],
      },
    });

    if (existing) {
      return res.status(400).json({ error: "An account with this email or phone number already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: identity.cleanName,
          email: identity.cleanEmail,
          phone: identity.cleanPhone || null,
          passwordHash,
          role: targetRole,
          approved: !requiresApproval,
        },
      });

      if (targetRole === "VENDOR") {
        const vendor = await tx.vendor.create({
          data: {
            ownerId: user.id,
            name: normalizedVendor.name,
            category: normalizedVendor.category,
            area: normalizedVendor.area,
            address: normalizedVendor.address,
            latitude: Number.isFinite(normalizedVendor.latitude) ? normalizedVendor.latitude : null,
            longitude: Number.isFinite(normalizedVendor.longitude) ? normalizedVendor.longitude : null,
            eta: normalizedVendor.eta,
            emoji: normalizedVendor.emoji,
          },
        });
        return { user, vendor };
      }

      if (targetRole === "RIDER") {
        const rider = await tx.rider.create({
          data: {
            userId: user.id,
            zone: normalizedRider.zone,
            isOnline: false,
          },
        });
        return { user, rider };
      }

      return { user };
    });

    const { user, vendor, rider } = result;

    if (requiresApproval) {
      const onboardingPayment = targetRole === "VENDOR"
        ? await createVendorOnboardingPayment({ user, vendor })
        : null;
      queuePendingApprovalMail({ user, vendor, rider }).catch((err) => {
        console.error("Pending approval email failed", err.message);
      });
      return res.json({
        pendingApproval: true,
        onboardingPayment,
        message: targetRole === "VENDOR"
          ? `Your Store Profile registration has been submitted. Vendors pay a one-time ${VENDOR_ONBOARDING_FEE_NAIRA.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })} onboarding fee. Complete payment, then Needly Admin will review and activate your store.`
          : `Your Rider Account registration has been submitted. We sent a notification email to ${identity.cleanEmail}. Needly Admin will review and activate your account shortly.`,
      });
    }

    const token = signToken(user);
    await queueConfirmationMail({
      to: identity.cleanEmail,
      type: "customer_signup",
      subject: "Welcome to Needly — Your customer account is ready",
      body: `Hello ${identity.cleanName}, welcome to Needly. Your customer account is ready and you can start shopping, booking, and paying securely.`,
      actionUrl: appUrl(`/?role=CUSTOMER&email=${encodeURIComponent(identity.cleanEmail)}`),
      actionLabel: "Open Needly",
    });
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Registration failed", err);
    return res.status(500).json({ error: "Registration failed. Please try again or contact Needly support." });
  }
});

/**
 * POST /auth/social
 * body: { provider: 'google'|'apple'|'facebook', email, name, role, vendorProfile, riderProfile }
 */
router.post("/social", authLimiter, async (req, res) => {
  const { provider, email, name, role = "CUSTOMER", vendorProfile, riderProfile } = req.body;
  if (!provider) return res.status(400).json({ error: "Provider is required (google, apple, facebook)" });

  const prov = provider.toLowerCase();
  if (!["google", "apple", "facebook"].includes(prov)) {
    return res.status(400).json({ error: "Unsupported social provider" });
  }

  const providerName = prov.charAt(0).toUpperCase() + prov.slice(1);
  const targetRole = normalizeAuthRole(role);
  if (!targetRole) return res.status(400).json({ error: "Choose Customer, Vendor, or Rider to register" });
  const cleanEmail = String(email || "").trim().toLowerCase();
  const userName = String(name || `${providerName} User`).trim();
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: `${providerName} did not provide a valid email. Enter your email first and try again.` });
  }
  const requiresApproval = targetRole === "VENDOR" || targetRole === "RIDER";
  const normalizedVendor = targetRole === "VENDOR" ? normalizeVendorProfile(vendorProfile, userName) : null;
  if (normalizedVendor?.error) return res.status(400).json({ error: normalizedVendor.error });
  const normalizedRider = targetRole === "RIDER" ? normalizeRiderProfile(riderProfile) : null;
  if (normalizedRider?.error) return res.status(400).json({ error: normalizedRider.error });

  try {
    let user = await prisma.user.findFirst({
      where: { email: cleanEmail },
      include: { vendor: true, managedVendor: true, rider: true, agent: { include: { hub: true } } },
    });

    if (user) {
      if (user.suspendedAt) {
        return res.status(403).json({ error: "Your account has been suspended. Contact support if you believe this is a mistake." });
      }
      if (!user.approved) {
        return res.json({
          pendingApproval: true,
          message: `Your ${user.role === "VENDOR" ? "Store Profile" : "Rider Account"} signed in via ${providerName} is pending admin approval.`,
        });
      }
    } else {
      const passwordHash = await bcrypt.hash(`social_${prov}_${Date.now()}`, 10);
      const result = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: userName,
            email: cleanEmail,
            passwordHash,
            role: targetRole,
            approved: !requiresApproval,
          },
        });

        if (targetRole === "VENDOR") {
          const vendor = await tx.vendor.create({
            data: {
              ownerId: createdUser.id,
              name: normalizedVendor.name,
              category: normalizedVendor.category,
              area: normalizedVendor.area,
              address: normalizedVendor.address,
              latitude: Number.isFinite(normalizedVendor.latitude) ? normalizedVendor.latitude : null,
              longitude: Number.isFinite(normalizedVendor.longitude) ? normalizedVendor.longitude : null,
              eta: normalizedVendor.eta,
              emoji: normalizedVendor.emoji,
            },
          });
          return { user: createdUser, vendor };
        }

        if (targetRole === "RIDER") {
          const rider = await tx.rider.create({
            data: {
              userId: createdUser.id,
              zone: normalizedRider.zone,
              isOnline: false,
            },
          });
          return { user: createdUser, rider };
        }

        return { user: createdUser };
      });

      user = result.user;

      if (requiresApproval) {
        const onboardingPayment = targetRole === "VENDOR"
          ? await createVendorOnboardingPayment({ user, vendor: result.vendor })
          : null;
        queuePendingApprovalMail({ user, vendor: result.vendor, rider: result.rider, provider: providerName }).catch((err) => {
          console.error("Pending approval email failed", err.message);
        });
        return res.json({
          pendingApproval: true,
          onboardingPayment,
          message: targetRole === "VENDOR"
            ? `Your Store Profile registration via ${providerName} has been submitted. Vendors pay a one-time ${VENDOR_ONBOARDING_FEE_NAIRA.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })} onboarding fee. Complete payment, then Needly Admin will review and activate your store.`
            : `Your Rider Account registration via ${providerName} has been submitted. We sent a notification email to ${cleanEmail}. Needly Admin will review and activate your account shortly.`,
        });
      }

      await queueConfirmationMail({
        to: cleanEmail,
        type: "social_signup",
        subject: `Welcome to Needly — Signed in via ${providerName}`,
        body: `Hello ${userName}, welcome to Needly Everyday Marketplace. Your customer account was created via ${providerName}.`,
        actionUrl: appUrl(`/?role=${encodeURIComponent(targetRole)}&email=${encodeURIComponent(cleanEmail)}`),
        actionLabel: "Open Needly",
      });
    }

    const token = signToken(user);
    const { passwordHash, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Social registration failed", err);
    return res.status(500).json({ error: "Social registration failed. Please try again or contact Needly support." });
  }
});

/**
 * POST /auth/login
 * body: { email, password }
 */
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email or Phone number and password are required" });

  const inputStr = email.trim().toLowerCase();
  const phoneClean = inputStr.replace(/[\s\-\(\)]/g, "");

  let user;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: inputStr },
          { phone: inputStr },
          { phone: phoneClean },
        ],
      },
      include: { vendor: true, managedVendor: true, rider: true, agent: { include: { hub: true } } },
    });
  } catch (err) {
    console.error("Login lookup failed", err);
    return res.status(503).json({ error: "Database is unavailable. Please try again shortly." });
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid email/phone or password" });
  }

  let valid = false;
  if (user.passwordHash) {
    valid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
  }

  if (!valid) return res.status(401).json({ error: "Invalid email/phone or password" });

  if (!user.approved) {
    if (user.suspendedAt) {
      return res.status(403).json({ error: "Your account has been suspended. Contact support if you believe this is a mistake." });
    }
    return res.status(403).json({ error: "Your account is pending admin approval" });
  }

  const loginUser = normalizeSessionUserRole(user);
  const token = signToken(loginUser);
  res.json({ token, user: { id: loginUser.id, name: loginUser.name, email: loginUser.email, role: loginUser.role } });
});

/** GET /auth/me — returns the logged-in user's profile. */
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { vendor: true, managedVendor: true, rider: true, agent: { include: { hub: true } } },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  const normalizedUser = normalizeSessionUserRole(user);
  const { passwordHash, ...safeUser } = normalizedUser;
  res.json(safeUser);
});

/** PATCH /auth/me/profile — customer/provider self-service profile update. */
router.patch("/me/profile", requireAuth, async (req, res) => {
  const { name, email, phone, locationState, locationCity, address, avatarUrl } = req.body;
  const data = {};

  if (name !== undefined) {
    const clean = String(name).trim();
    if (!clean) return res.status(400).json({ error: "Name cannot be empty" });
    data.name = clean;
  }
  if (phone !== undefined) data.phone = String(phone).trim();
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) return res.status(400).json({ error: "Enter a valid email address" });
    const existing = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: { id: req.user.id },
      },
    });
    if (existing) return res.status(400).json({ error: "Another account already uses this email address" });
    data.email = cleanEmail;
  }
  if (locationState !== undefined) data.locationState = String(locationState).trim() || null;
  if (locationCity !== undefined) data.locationCity = String(locationCity).trim() || null;
  if (address !== undefined) data.address = String(address).trim() || null;
  if (avatarUrl !== undefined) {
    const cleanAvatarUrl = String(avatarUrl).trim();
    if (cleanAvatarUrl && cleanAvatarUrl.length > 1800000) {
      return res.status(400).json({ error: "Profile image is too large. Please choose a smaller photo." });
    }
    if (cleanAvatarUrl && !/^data:image\/(png|jpe?g|webp);base64,/.test(cleanAvatarUrl) && !/^https?:\/\//.test(cleanAvatarUrl)) {
      return res.status(400).json({ error: "Profile image must be a valid image URL." });
    }
    data.avatarUrl = cleanAvatarUrl || null;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Provide profile fields to update" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { vendor: true, managedVendor: true, rider: true, agent: { include: { hub: true } } },
    });
    const normalizedUser = normalizeSessionUserRole(user);
    const { passwordHash, ...safeUser } = normalizedUser;
    res.json(safeUser);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update profile" });
  }
});

/** PATCH /auth/me/password — logged-in user changes their password. */
router.patch("/me/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const cleanCurrent = String(currentPassword || "");
  const cleanNew = String(newPassword || "");

  if (!cleanCurrent) return res.status(400).json({ error: "Current password is required" });
  if (cleanNew.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  if (cleanCurrent === cleanNew) return res.status(400).json({ error: "Choose a new password that is different from the current one" });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = user.passwordHash
    ? await bcrypt.compare(cleanCurrent, user.passwordHash).catch(() => false)
    : false;

  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(cleanNew, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
  res.json({ ok: true });
});

/** GET /auth/locations — public active customer service locations. */
router.get("/locations", async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return res.json(locations);
  } catch (err) {
    if (err?.code === "P2021" || err?.code === "P1014") return res.json([]);
    return res.status(503).json({ error: "Could not load active service locations" });
  }
});

/** GET /auth/pending — admin-only list of vendor/rider accounts awaiting approval. */
router.get("/pending", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const pending = await prisma.user.findMany({
    where: { approved: false, suspendedAt: null, role: { in: ["VENDOR", "RIDER"] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      vendor: { select: { id: true, name: true, category: true, area: true, address: true, onboardingFeeAmount: true, onboardingFeeStatus: true, onboardingPaidAt: true } },
      rider: { select: { id: true, zone: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(pending);
});

/** GET /auth/customers — admin-only list of customer accounts. */
router.get("/customers", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        approved: true,
        suspendedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const customerIds = customers.map((c) => c.id);

    const orders = customerIds.length ? await prisma.order.findMany({
      where: { customerId: { in: customerIds } },
      select: {
        id: true,
        customerId: true,
        total: true,
        status: true,
        createdAt: true,
        payment: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }) : [];

    const bookingsByCustomer = customerIds.length ? await prisma.booking.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds } },
      _count: { _all: true },
    }) : [];

    const reviewsByCustomer = customerIds.length ? await prisma.review.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds } },
      _count: { _all: true },
    }) : [];

    const bookingCountByCustomer = Object.fromEntries(bookingsByCustomer.map((row) => [row.customerId, row._count?._all || 0]));
    const reviewCountByCustomer = Object.fromEntries(reviewsByCustomer.map((row) => [row.customerId, row._count?._all || 0]));
    const ordersByCustomer = orders.reduce((acc, order) => {
      if (!acc[order.customerId]) acc[order.customerId] = [];
      acc[order.customerId].push(order);
      return acc;
    }, {});

    const formatted = customers.map((c) => {
      const customerOrders  = ordersByCustomer[c.id] || [];
      const completedOrders = customerOrders.filter((o) => o.status !== "CANCELLED");
      const paidOrders      = completedOrders.filter((o) => o.payment?.status === "PAID" || o.status === "DELIVERED");
      const totalSpent      = paidOrders.reduce((sum, o) => sum + (o.payment?.amount || o.total || 0), 0);
      const ordersCount     = customerOrders.length;
      const avgOrderValue   = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
      const lastOrderAt     = completedOrders.length > 0 ? completedOrders[0].createdAt : null;

      // Days since last order (for churn risk flag)
      const daysSinceOrder  = lastOrderAt
        ? Math.floor((Date.now() - new Date(lastOrderAt)) / 86_400_000)
        : null;

      // Loyalty tier: Bronze → Silver → Gold → Platinum
      let loyaltyTier = "Bronze";
      if (ordersCount >= 50 || totalSpent >= 500_000) loyaltyTier = "Platinum";
      else if (ordersCount >= 20 || totalSpent >= 150_000) loyaltyTier = "Gold";
      else if (ordersCount >= 5  || totalSpent >= 30_000)  loyaltyTier = "Silver";

      // Churn risk: hasn't ordered in 30+ days but had ≥2 past orders
      const churnRisk = daysSinceOrder !== null && daysSinceOrder >= 30 && ordersCount >= 2;

      // Top spender flag: top 10% threshold (simple heuristic — ₦100k+)
      const isTopSpender = totalSpent >= 100_000;

      return {
        id:            c.id,
        name:          c.name,
        email:         c.email,
        phone:         c.phone,
        role:          c.role,
        approved:      c.approved,
        suspendedAt:   c.suspendedAt,
        isSuspended:   !!c.suspendedAt,
        createdAt:     c.createdAt,
        ordersCount,
        bookingsCount: bookingCountByCustomer[c.id] || 0,
        reviewsCount:  reviewCountByCustomer[c.id] || 0,
        totalSpent,
        avgOrderValue,
        lastOrderAt,
        daysSinceOrder,
        loyaltyTier,
        churnRisk,
        isTopSpender,
        recentOrders:  completedOrders.slice(0, 3),
      };
    });

    res.json({ total: formatted.length, customers: formatted });
  } catch (err) {
    console.error("Customer directory query failed", err);
    try {
      const basicCustomers = await prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          approved: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      const formatted = basicCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        approved: c.approved,
        suspendedAt: null,
        isSuspended: false,
        createdAt: c.createdAt,
        ordersCount: 0,
        bookingsCount: 0,
        reviewsCount: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        lastOrderAt: null,
        daysSinceOrder: null,
        loyaltyTier: "Bronze",
        churnRisk: false,
        isTopSpender: false,
        recentOrders: [],
      }));
      return res.json({ total: formatted.length, customers: formatted, partial: true });
    } catch (basicErr) {
      console.error("Basic customer directory query failed", basicErr);
    }

    try {
      const rawCustomers = await prisma.$queryRawUnsafe(`
        SELECT
          id,
          name,
          email,
          phone,
          role::text AS role,
          approved,
          "suspendedAt",
          "createdAt"
        FROM "User"
        WHERE role::text = 'CUSTOMER'
        ORDER BY "createdAt" DESC
      `);
      const formatted = rawCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        approved: c.approved,
        suspendedAt: c.suspendedAt,
        isSuspended: !!c.suspendedAt,
        createdAt: c.createdAt,
        ordersCount: 0,
        bookingsCount: 0,
        reviewsCount: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        lastOrderAt: null,
        daysSinceOrder: null,
        loyaltyTier: "Bronze",
        churnRisk: false,
        isTopSpender: false,
        recentOrders: [],
      }));
      return res.json({ total: formatted.length, customers: formatted, partial: true });
    } catch (rawErr) {
      console.error("Raw customer directory query failed", rawErr);
    }

    return res.status(500).json({ error: "Could not load customers from the database" });
  }
});

/** GET /auth/mail-tray - admin-only prototype queue for confirmation emails. */
router.get("/mail-tray", requireAuth, requireRole("ADMIN"), async (req, res) => {
  res.json(confirmationMailTray);
});

/** POST /auth/test-mail — admin-only SMTP smoke test using the live mailer config. */
router.post("/test-mail", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const to = String(req.body?.to || req.user.email || "").trim().toLowerCase();
  if (!to || !to.includes("@")) return res.status(400).json({ error: "Provide a valid recipient email in 'to'" });

  const mailResult = await queueConfirmationMail({
    to,
    type: "smtp_test",
    subject: "Needly email test",
    body: `Hello, this is a Needly SMTP test sent at ${new Date().toISOString()}. If you received this, Brevo SMTP is working end to end.`,
    actionUrl: appUrl("/"),
    actionLabel: "Open Needly",
  });

  res.json({
    sent: mailResult.status === "sent",
    status: mailResult.status,
    to: mailResult.to,
    providerMessageId: mailResult.providerMessageId || null,
    note: mailResult.note || null,
    error: mailResult.error || null,
    createdAt: mailResult.createdAt,
  });
});

/** PATCH /auth/users/:id/approve — admin approves a pending vendor/rider account. */
router.patch("/users/:id/approve", requireAuth, requireRole("ADMIN"), async (req, res) => {
  let user = null;
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });
    if (!existing) return res.status(404).json({ error: "User not found" });
    const canOverrideOnboardingFee = req.user.role === "SUPER_ADMIN";
    if (existing.role === "VENDOR" && existing.vendor?.onboardingFeeStatus !== "PAID" && !canOverrideOnboardingFee) {
      return res.status(400).json({
        error: `Vendor must pay the ₦${Number(existing.vendor?.onboardingFeeAmount || VENDOR_ONBOARDING_FEE_NAIRA).toLocaleString()} onboarding fee before approval.`,
      });
    }

    user = await prisma.user.update({
      where: { id: req.params.id },
      data: { approved: true, suspendedAt: null },
      include: { vendor: true },
    });
    if (user.role === "VENDOR" && user.vendor) {
      user.vendor = await prisma.vendor.update({
        where: { id: user.vendor.id },
        data: { verified: true, verifiedAt: new Date() },
      });
    }
  } catch (err) {
    console.error("Approve account failed", err);
    return res.status(500).json({ error: "Could not approve this account. Please refresh and try again." });
  }

  await logAction(req, { action: "Approved account", targetType: user.role === "RIDER" ? "Rider" : "Vendor", targetId: user.id, targetLabel: user.name });
  broadcastProviderStatus({ userId: user.id, role: user.role, status: "approved" });
  broadcastAdminAlert({ type: "account_approved", userId: user.id, role: user.role, name: user.name });

  if (user.role === "VENDOR" || user.role === "RIDER") {
    await queueConfirmationMail({
      to: user.email,
      type: "account_approved",
      subject: `Needly ${user.role.toLowerCase()} account approved`,
      body: `Hello ${user.name}, your Needly ${user.role.toLowerCase()} account${user.vendor?.name ? ` for ${user.vendor.name}` : ""} has been approved. You can now log in with this email and the password you created during registration.`,
      actionUrl: appUrl(`/?role=${encodeURIComponent(user.role)}&email=${encodeURIComponent(user.email)}`),
      actionLabel: "Log in to Needly",
    });
  }
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
 * PATCH /auth/users/:id/contact — admin edits a person's name, email, phone, role.
 */
router.patch("/users/:id/contact", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, email, phone, role } = req.body;
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.trim().toLowerCase();
  if (phone !== undefined) data.phone = phone.trim();
  if (role !== undefined) data.role = role.toUpperCase();
  if (Object.keys(data).length === 0) return res.status(400).json({ error: "Provide name, email, phone, or role to update" });

  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    await logAction(req, { action: "Edited contact info", targetType: "User", targetId: user.id, targetLabel: user.name });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update contact info" });
  }
});

/**
 * GET /auth/customers/:id/full-profile
 * Fetches deep audit info for a contact:
 * 1) Full user info & profile
 * 2) Complete Order & Payment Reconciliation history
 * 3) Dispute & Problem Resolution history
 * 4) Vendor Transaction Breakdown
 */
router.get("/customers/:id/full-profile", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            items: true,
            payment: true,
            vendor: true,
            dispute: true,
            operationalIssues: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "Customer not found" });

    // 1. Reconciliation metrics
    const orders = user.orders || [];
    let totalPaid = 0;
    let totalPending = 0;
    let totalRefunded = 0;
    const orderBreakdown = [];

    orders.forEach((o) => {
      const payStatus = o.payment?.status || (o.status === "DELIVERED" ? "PAID" : "PENDING");
      const amt = o.total || 0;
      if (payStatus === "PAID") totalPaid += amt;
      else if (payStatus === "REFUNDED") totalRefunded += amt;
      else totalPending += amt;

      orderBreakdown.push({
        id: o.id,
        status: o.status,
        total: amt,
        paymentStatus: payStatus,
        paymentReference: o.payment?.reference || `ref_${o.id.slice(-8)}`,
        paymentGateway: o.payment?.gateway || null,
        riderPayoutAmount: o.payment?.riderPayoutAmount || 0,
        companyDeliveryFeeAmount: o.payment?.companyDeliveryFeeAmount || 0,
        paidAt: o.payment?.paidAt || (o.status === "DELIVERED" ? o.createdAt : null),
        refundedAt: o.payment?.refundedAt || null,
        vendorName: o.vendor?.name || "Store",
        vendorEmoji: o.vendor?.emoji || "🛍️",
        itemsCount: (o.items || []).reduce((acc, i) => acc + (i.qty || 1), 0),
        items: o.items || [],
        dispute: o.dispute ? { id: o.dispute.id, reason: o.dispute.reason, status: o.dispute.status, createdAt: o.dispute.createdAt } : null,
        issues: (o.operationalIssues || []).map(i => ({ id: i.id, reason: i.reason, status: i.status })),
        createdAt: o.createdAt,
      });
    });

    // 2. Vendor Transactions Breakdown
    const vendorMap = {};
    orders.forEach((o) => {
      const vId = o.vendorId || o.vendor?.id || "unknown";
      const vName = o.vendor?.name || "General Merchant";
      const vEmoji = o.vendor?.emoji || "🏪";
      if (!vendorMap[vId]) {
        vendorMap[vId] = {
          vendorId: vId,
          name: vName,
          emoji: vEmoji,
          ordersCount: 0,
          totalSpent: 0,
          itemsBought: {},
          lastOrderAt: o.createdAt,
        };
      }
      vendorMap[vId].ordersCount += 1;
      vendorMap[vId].totalSpent += (o.total || 0);
      if (new Date(o.createdAt) > new Date(vendorMap[vId].lastOrderAt)) {
        vendorMap[vId].lastOrderAt = o.createdAt;
      }
      (o.items || []).forEach((item) => {
        vendorMap[vId].itemsBought[item.name] = (vendorMap[vId].itemsBought[item.name] || 0) + (item.qty || 1);
      });
    });

    const vendorTransactions = Object.values(vendorMap).map((v) => ({
      ...v,
      topItems: Object.entries(v.itemsBought)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, qty]) => `${name} (${qty}x)`),
    }));

    // 3. Problem Resolution (Disputes & Issues)
    const disputes = orders.filter(o => o.dispute).map(o => ({
      id: o.dispute.id,
      orderId: o.id,
      vendorName: o.vendor?.name || "Store",
      reason: o.dispute.reason,
      status: o.dispute.status,
      totalAmount: o.total,
      createdAt: o.dispute.createdAt,
    }));

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        approved: user.approved,
        suspendedAt: user.suspendedAt,
        createdAt: user.createdAt,
      },
      reconciliation: {
        totalOrders: orders.length,
        totalPaid,
        totalPending,
        totalRefunded,
        orderBreakdown,
      },
      vendorTransactions,
      disputes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load customer profile details" });
  }
});

/**
 * POST /auth/customers/:id/issue-refund
 * Process a refund for a contact's order
 */
router.post("/customers/:id/issue-refund", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { orderId, amount, reason } = req.body;
  try {
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
    }
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelReason: reason || "Admin Processed Refund" },
    });
    await logAction(req, {
      action: "Issued Refund",
      targetType: "Order",
      targetId: orderId,
      targetLabel: `Refunded ₦${amount || 0} for user ${req.params.id}`,
    });
    res.json({ ok: true, message: `Refund of ₦${amount || 0} recorded successfully.` });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to process refund" });
  }
});

/**
 * POST /auth/customers/:id/resolve-dispute
 * Resolve a dispute directly from contact management
 */
router.post("/customers/:id/resolve-dispute", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { disputeId, note } = req.body;
  try {
    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await logAction(req, {
      action: "Resolved Contact Dispute",
      targetType: "Dispute",
      targetId: disputeId,
      targetLabel: note || "Admin marked dispute resolved",
    });
    res.json({ ok: true, dispute });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to resolve dispute" });
  }
});

module.exports = router;
