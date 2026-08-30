const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole, requirePermission } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");
const { broadcastContactUpdate, broadcastContactSettings } = require("../sockets/orderSocket");
const { INTEGRATION_CATALOG, getIntegrationValue, listIntegrationSettings, upsertIntegrationSetting } = require("../lib/integrationSettings");
const { getAvailablePaymentGateways } = require("../lib/paymentGateway");
const { getJwtSecret } = require("../lib/jwtSecret");

const router = express.Router();

function generateTempPassword() {
  return `Nd-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function percentageChange(current, previous) {
  if (!previous && !current) return "0%";
  if (!previous) return "+100%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

const isMissingTableError = (err) => {
  const message = String(err?.message || "");
  return err?.code === "P2021" || /table .* does not exist|does not exist in the current database/i.test(message);
};

const emptyIfMissingTable = async (query, fallback) => {
  try {
    return await query;
  } catch (err) {
    if (isMissingTableError(err)) return fallback;
    throw err;
  }
};

// Enforce authentication & Super Admin/Admin permission on all /admin routes
router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN", "ADMIN"));

/**
 * GET /admin/stats/overview
 * Central Super Admin KPI dashboard overview.
 */
router.get("/stats/overview", async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = addDays(todayStart, -1);
    const weekStart = addDays(todayStart, -6);
    const previousWeekStart = addDays(weekStart, -7);
    const monthStart = startOfDay(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
    const previousMonthStart = startOfDay(new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1));

    const [
      totalCustomers,
      activeCustomers,
      totalVendors,
      activeVendors,
      pendingVendors,
      totalRiders,
      totalAgents,
      onlineAgents,
      onlineRiders,
      totalProviders,
      ordersToday,
      activeOrders,
      completedOrders,
      cancelledOrders,
      activeBookings,
      allOrders,
      payments,
      payouts,
      openTicketsCount,
      pendingRefundsCount,
      ordersYesterday,
      ordersThisWeek,
      ordersPreviousWeek,
      ordersThisMonth,
      ordersPreviousMonth,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "CUSTOMER", approved: true, suspendedAt: null } }),
      prisma.vendor.count(),
      prisma.vendor.count({ where: { isOpen: true } }),
      prisma.user.count({ where: { role: "VENDOR", approved: false, suspendedAt: null } }),
      prisma.rider.count(),
      prisma.agent.count(),
      prisma.agent.count({ where: { isOnline: true } }),
      prisma.rider.count({ where: { isOnline: true } }),
      prisma.user.count({ where: { role: "MANAGER" } }),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { status: { in: ["PLACED", "ACCEPTED", "READY", "PICKED_UP"] } } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      emptyIfMissingTable(prisma.booking.count({ where: { status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] } } }), 0),
      prisma.order.findMany({ select: { total: true, status: true } }),
      prisma.payment.findMany({ select: { amount: true, platformFeeAmount: true, companyDeliveryFeeAmount: true, riderPayoutAmount: true, agentPayoutAmount: true, status: true } }),
      prisma.payout.findMany({ select: { amount: true, status: true, riderId: true } }),
      prisma.supportTicket ? emptyIfMissingTable(prisma.supportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "WAITING"] } } }), 0) : Promise.resolve(0),
      prisma.refund ? emptyIfMissingTable(prisma.refund.count({ where: { status: "REQUESTED" } }), 0) : Promise.resolve(0),
      prisma.order.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.order.count({ where: { createdAt: { gte: previousWeekStart, lt: weekStart } } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.count({ where: { createdAt: { gte: previousMonthStart, lt: monthStart } } }),
    ]);

    const grossRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const globalFeeRule = await prisma.commissionRule.findFirst({
      where: { active: true, targetType: "GLOBAL" },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);
    const platformFeePercent = Number(globalFeeRule?.ratePercent ?? 2.5);
    const paidPayments = payments.filter((payment) => payment.status === "PAID");
    const platformCommission = paidPayments.reduce(
      (sum, payment) => sum + (payment.platformFeeAmount || 0) + (payment.companyDeliveryFeeAmount || 0),
      0,
    );
    const riderEarningsTotal = paidPayments.reduce((sum, payment) => sum + (payment.riderPayoutAmount || 0), 0);
    const agentEarningsTotal = paidPayments.reduce((sum, payment) => sum + (payment.agentPayoutAmount || 0), 0);
    const vendorPayoutsTotal = payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);
    const riderPayoutsTotal = payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);

    res.json({
      totalCustomers,
      activeCustomers,
      totalVendors,
      activeVendors,
      pendingVendors,
      totalRiders,
      totalAgents,
      onlineAgents,
      onlineRiders,
      totalProviders,
      ordersToday,
      activeOrders,
      completedOrders,
      cancelledOrders,
      activeBookings,
      grossRevenue,
      platformCommission,
      platformFeePercent,
      riderFeePercent: 5,
      riderEarningsTotal,
      agentCollectionFee: Number(process.env.AGENT_COLLECTION_FEE_NAIRA || 300),
      agentEarningsTotal,
      vendorPayoutsTotal,
      riderPayoutsTotal,
      pendingRefundsCount,
      openTicketsCount,
      comparisons: {
        todayVsYesterday: percentageChange(ordersToday, ordersYesterday),
        thisWeekVsLastWeek: percentageChange(ordersThisWeek, ordersPreviousWeek),
        thisMonthVsLastMonth: percentageChange(ordersThisMonth, ordersPreviousMonth),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/live-operations
 * Real-time active operational metrics across logistics, orders, and vendors.
 */
router.get("/live-operations", async (req, res) => {
  try {
    const [
      liveOrders,
      activeBookings,
      ridersOnline,
      ridersOnDelivery,
      vendorsAccepting,
      vendorsOffline,
      unassignedOrders,
      openDisputes,
      operationalIssues,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { status: { in: ["PLACED", "ACCEPTED", "READY", "PICKED_UP"] } },
        include: { vendor: true, customer: true, rider: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      emptyIfMissingTable(prisma.booking.findMany({
        where: { status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] } },
        include: { service: true, customer: true },
        take: 10,
      }), []),
      prisma.rider.findMany({
        where: { isOnline: true },
        include: { user: true },
      }),
      prisma.rider.count({
        where: { isOnline: true, orders: { some: { status: { in: ["ACCEPTED", "READY", "PICKED_UP"] } } } },
      }),
      prisma.vendor.count({ where: { isOpen: true } }),
      prisma.vendor.count({ where: { isOpen: false } }),
      prisma.order.count({ where: { status: "READY", riderId: null } }),
      prisma.dispute.count({ where: { status: "OPEN" } }),
      emptyIfMissingTable(prisma.operationalIssue.count({ where: { status: "OPEN" } }), 0),
    ]);

    res.json({
      liveOrders,
      activeBookings,
      ridersOnlineCount: ridersOnline.length,
      ridersOnDeliveryCount: ridersOnDelivery,
      vendorsAcceptingCount: vendorsAccepting,
      vendorsOfflineCount: vendorsOffline,
      unassignedOrdersCount: unassignedOrders,
      activeComplaintsCount: openDisputes + operationalIssues,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/health
 * Returns platform system health status for backend services.
 */
router.get("/health", async (req, res) => {
  const checks = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.databaseHealth = "Operational";
  } catch (err) {
    checks.databaseHealth = "Down";
  }

  const [smtpHost, smtpUser, smtpPass, brevoApiKey, googleClientId, appleClientId, facebookAppId, paymentGateways] = await Promise.all([
    getIntegrationValue("brevo", "SMTP_HOST"),
    getIntegrationValue("brevo", "SMTP_USER"),
    getIntegrationValue("brevo", "SMTP_PASS"),
    getIntegrationValue("brevo", "BREVO_API_KEY"),
    getIntegrationValue("social", "GOOGLE_CLIENT_ID"),
    getIntegrationValue("social", "APPLE_CLIENT_ID"),
    getIntegrationValue("social", "FACEBOOK_APP_ID"),
    getAvailablePaymentGateways().catch(() => []),
  ]);

  const emailConfigured = !!brevoApiKey || !!(smtpHost && smtpUser && smtpPass);
  const paymentConfigured = paymentGateways.some((gateway) => gateway.enabled);
  const realtimeReady = !!req.app.get("io");
  const anyDown = checks.databaseHealth !== "Operational";

  res.json({
    status: anyDown ? "DEGRADED" : "OPERATIONAL",
    apiHealth: "Operational",
    databaseHealth: checks.databaseHealth,
    storageHealth: "Not configured",
    backgroundJobs: "Operational",
    emailService: emailConfigured ? "Configured" : "Not configured",
    smsService: "Not configured",
    paymentGateway: paymentConfigured ? "Configured" : "Not configured",
    paymentGateways,
    googleAuthService: googleClientId ? "Configured" : "Not configured",
    appleAuthService: appleClientId ? "Configured" : "Not configured",
    facebookAuthService: facebookAppId ? "Configured" : "Not configured",
    realtimeSockets: realtimeReady ? "Operational" : "Not initialized",
    lastCheckedAt: new Date().toISOString(),
  });
});

/**
 * GET/PATCH /admin/integrations
 * Super Admin controlled API key vault. Values are masked when read.
 */
router.get("/integrations", async (req, res) => {
  try {
    res.json(await listIntegrationSettings());
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load integration settings" });
  }
});

router.patch("/integrations", async (req, res) => {
  try {
    const { provider, key, value } = req.body;
    if (!provider || !key) return res.status(400).json({ error: "Provider and key are required" });
    const group = INTEGRATION_CATALOG.find((item) => item.provider === provider);
    const setting = group?.settings.find((item) => item.key === key);
    if (!setting) return res.status(400).json({ error: "Unknown integration setting" });
    if (!value || String(value).includes("••••")) {
      return res.status(400).json({ error: "Paste a new value before saving" });
    }

    const updated = await upsertIntegrationSetting({
      provider,
      key,
      value,
      isSecret: !!setting.secret,
      updatedBy: req.user.email || req.user.id,
    });

    await logAction(req, {
      action: "Updated integration API setting",
      targetType: "IntegrationSetting",
      targetId: updated.id,
      targetLabel: `${provider}.${key}`,
    });
    res.json(await listIntegrationSettings());
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update integration setting" });
  }
});

/**
 * GET /admin/roles & POST /admin/roles
 * RBAC Role management
 */
router.get("/roles", async (req, res) => {
  try {
    const roles = await prisma.appRole.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(roles);
  } catch (err) {
    if (isMissingTableError(err)) return res.json([]);
    res.status(500).json({ error: err.message || "Failed to load roles" });
  }
});

router.post("/roles", async (req, res) => {
  const { name, description, permissionCodes = [] } = req.body;
  if (!name) return res.status(400).json({ error: "Role name is required" });

  try {
    const role = await prisma.appRole.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
      },
    });

    if (permissionCodes.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
      });
      const data = perms.map((p) => ({ roleId: role.id, permissionId: p.id }));
      await prisma.rolePermission.createMany({ data });
    }

    await logAction(req, { action: "Created role", targetType: "Role", targetId: role.id, targetLabel: role.name });
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /admin/permissions
 * List all available system permissions
 */
router.get("/permissions", async (req, res) => {
  try {
    const perms = await prisma.permission.findMany({ orderBy: { module: "asc" } });
    res.json(perms);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load permissions" });
  }
});

/**
 * GET/POST/PATCH /admin/locations
 * Location & Coverage territory management
 */
router.get("/locations", async (req, res) => {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load locations" });
  }
});

router.post("/locations", async (req, res) => {
  const { name, state = "Ogun", type = "CITY", deliveryFee = 500, maxDistance = 25 } = req.body;
  if (!name) return res.status(400).json({ error: "Location name is required" });
  try {
    const loc = await prisma.location.create({
      data: { name: name.trim(), state: String(state || "Ogun").trim() || "Ogun", type, deliveryFee: Number(deliveryFee), maxDistance: Number(maxDistance) },
    });
    await logAction(req, { action: "Added location", targetType: "Location", targetId: loc.id, targetLabel: loc.name });
    res.status(201).json(loc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function categoryPayload(body = {}) {
  const key = String(body.key || body.category || body.name || "").trim();
  const label = String(body.label || body.name || key || "").trim();
  const flow = String(body.flow || "BUY").trim().toUpperCase();
  const slug = String(body.slug || key).trim().toLowerCase().replace(/[^a-z0-9/]+/g, "-").replace(/(^-|-$)/g, "");
  const type = String(body.type || "CATEGORY").trim().toUpperCase();
  if (!key || !label) {
    const err = new Error("Category key and label are required");
    err.statusCode = 400;
    throw err;
  }
  if (!["BUY", "BOOK", "RESERVE"].includes(flow)) {
    const err = new Error("Category flow must be BUY, BOOK, or RESERVE");
    err.statusCode = 400;
    throw err;
  }
  if (!["DIVISION", "CATEGORY", "SUBCATEGORY", "TYPE"].includes(type)) {
    const err = new Error("Category type must be DIVISION, CATEGORY, SUBCATEGORY, or TYPE");
    err.statusCode = 400;
    throw err;
  }
  const active = body.active === undefined
    ? undefined
    : body.active === true || ["true", "yes", "1"].includes(String(body.active).trim().toLowerCase());
  const boolField = (value) => value === true || ["true", "yes", "1"].includes(String(value).trim().toLowerCase());
  const position = body.position === undefined ? undefined : Number(body.position);
  if (position !== undefined && !Number.isFinite(position)) {
    const err = new Error("Category position must be a number");
    err.statusCode = 400;
    throw err;
  }
  return {
    key,
    label,
    slug,
    flow,
    type,
    parentId: body.parentId === undefined ? undefined : String(body.parentId || "").trim() || null,
    divisionId: body.divisionId === undefined ? undefined : String(body.divisionId || "").trim() || null,
    description: body.description === undefined ? undefined : String(body.description || "").trim(),
    icon: body.icon === undefined ? undefined : String(body.icon || "").trim(),
    imageKey: body.imageKey === undefined ? undefined : String(body.imageKey || key).trim(),
    image: body.image === undefined ? undefined : String(body.image || "").trim() || null,
    bannerImage: body.bannerImage === undefined ? undefined : String(body.bannerImage || "").trim() || null,
    isFeatured: body.isFeatured === undefined ? undefined : boolField(body.isFeatured),
    showOnHomepage: body.showOnHomepage === undefined ? undefined : boolField(body.showOnHomepage),
    customFields: body.customFields === undefined ? undefined : (Array.isArray(body.customFields) ? body.customFields : []),
    position,
    active,
    location: body.location === undefined ? undefined : String(body.location || "").trim(),
  };
}

router.post("/categories", async (req, res) => {
  try {
    const data = categoryPayload(req.body);
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const category = await prisma.category.create({ data });
    await logAction(req, { action: "Created category", targetType: "Category", targetId: category.id, targetLabel: category.label });
    res.status(201).json(category);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message || "Failed to create category" });
  }
});

function adminCategorySelect(category) {
  return {
    ...category,
    name: category.label,
    availableLabel: category.active ? "Active" : "Inactive",
  };
}

router.get("/marketplace/divisions", async (_req, res) => {
  try {
    const divisions = await prisma.category.findMany({
      where: { type: "DIVISION", deletedAt: null },
      include: { children: { where: { deletedAt: null }, orderBy: [{ position: "asc" }, { label: "asc" }] } },
      orderBy: [{ position: "asc" }, { label: "asc" }],
    });
    res.json(divisions.map(adminCategorySelect));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load marketplace divisions" });
  }
});

router.post("/marketplace/divisions", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const data = categoryPayload({ ...req.body, type: "DIVISION", parentId: null });
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const division = await prisma.category.create({ data: { ...data, divisionId: null } });
    await logAction(req, { action: "Created marketplace division", targetType: "Category", targetId: division.id, targetLabel: division.label });
    res.status(201).json(division);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message || "Failed to create marketplace division" });
  }
});

router.get("/marketplace/categories", async (req, res) => {
  try {
    const { divisionId, parentId, type } = req.query;
    const categories = await prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(divisionId ? { divisionId: String(divisionId) } : {}),
        ...(parentId !== undefined ? { parentId: parentId ? String(parentId) : null } : {}),
        ...(type ? { type: String(type).toUpperCase() } : {}),
      },
      include: { parent: true, children: { where: { deletedAt: null }, orderBy: [{ position: "asc" }, { label: "asc" }] } },
      orderBy: [{ type: "asc" }, { position: "asc" }, { label: "asc" }],
      take: 2000,
    });
    res.json(categories.map(adminCategorySelect));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load marketplace categories" });
  }
});

router.post("/marketplace/categories", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const data = categoryPayload(req.body);
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const category = await prisma.category.create({ data });
    await logAction(req, { action: "Created marketplace category", targetType: "Category", targetId: category.id, targetLabel: category.label });
    res.status(201).json(category);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message || "Failed to create marketplace category" });
  }
});

/**
 * GET/POST /admin/commissions
 * Commission Rules management
 */
router.get("/commissions", async (req, res) => {
  try {
    let rules = await prisma.commissionRule.findMany({ orderBy: { createdAt: "desc" } });
    if (!rules.some((rule) => rule.targetType === "GLOBAL" && rule.active)) {
      const defaultRule = await prisma.commissionRule.create({
        data: { targetType: "GLOBAL", targetName: "Needly Platform Fee", ratePercent: 2.5, active: true },
      });
      rules = [defaultRule, ...rules];
    }
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load commission rules" });
  }
});

router.post("/commissions", async (req, res) => {
  const { targetType = "GLOBAL", targetName, ratePercent } = req.body;
  try {
    const parsedRate = Number(ratePercent);
    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      return res.status(400).json({ error: "Enter a valid fee percentage" });
    }
    const rule = await prisma.commissionRule.create({
      data: { targetType, targetName: targetName ? targetName.trim() : "Needly Platform Fee", ratePercent: parsedRate },
    });
    await logAction(req, { action: "Set commission rule", targetType: "CommissionRule", targetId: rule.id, targetLabel: `${rule.ratePercent}%` });
    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET/POST /admin/promotions
 * Promotions & Coupon management
 */
router.get("/promotions", async (req, res) => {
  try {
    const promos = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load promotions" });
  }
});

function promotionPayload(body = {}) {
  const placement = String(body.placement || "COUPON").trim().toUpperCase();
  const isHomepageBanner = placement === "HOMEPAGE_CAROUSEL";
  const data = {
    code: String(body.code || "").trim().toUpperCase(),
    title: String(body.title || body.bannerTitle || "").trim(),
    discountType: String(body.discountType || "PERCENT").trim().toUpperCase(),
    discountValue: Number(body.discountValue || 0),
    minSpend: Number(body.minSpend || 0),
    usageLimit: Number(body.usageLimit || 100),
    placement,
    bannerImageUrl: body.bannerImageUrl !== undefined ? String(body.bannerImageUrl || "").trim() || null : undefined,
    bannerKicker: body.bannerKicker !== undefined ? String(body.bannerKicker || "").trim() || null : undefined,
    bannerTitle: body.bannerTitle !== undefined ? String(body.bannerTitle || "").trim() || null : undefined,
    bannerBody: body.bannerBody !== undefined ? String(body.bannerBody || "").trim() || null : undefined,
    bannerCta: body.bannerCta !== undefined ? String(body.bannerCta || "").trim() || null : undefined,
    bannerBadge: body.bannerBadge !== undefined ? String(body.bannerBadge || "").trim() || null : undefined,
    destinationCategory: body.destinationCategory !== undefined ? String(body.destinationCategory || "").trim() || null : undefined,
    location: body.location !== undefined ? String(body.location || "").trim() || null : undefined,
    displayOrder: Number(body.displayOrder || 0),
  };

  if (body.active !== undefined) data.active = body.active === true || String(body.active).toLowerCase() === "true";
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (!data.code) data.code = `BANNER-${Date.now()}`;
  if (!data.title) data.title = isHomepageBanner ? "Homepage Banner" : "";
  return data;
}

router.post("/promotions", async (req, res) => {
  const data = promotionPayload(req.body);
  if (!data.code || !data.title) return res.status(400).json({ error: "Code and title are required" });

  try {
    const promo = await prisma.promotion.create({
      data,
    });
    await logAction(req, { action: "Created promotion", targetType: "Promotion", targetId: promo.id, targetLabel: promo.code });
    res.status(201).json(promo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /admin/tickets
 * Support & Ticket Center
 */
router.get("/tickets", async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { user: true, assignedAdmin: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load tickets" });
  }
});

/**
 * GET /admin/refunds
 * Refund Management
 */
router.get("/refunds", async (req, res) => {
  try {
    const refunds = await prisma.refund.findMany({ orderBy: { createdAt: "desc" } });
    res.json(refunds);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load refunds" });
  }
});

router.get("/wallet-transactions", async (req, res) => {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(transactions);
  } catch (err) {
    if (isMissingTableError(err)) return res.json([]);
    res.status(500).json({ error: err.message || "Failed to load wallet transactions" });
  }
});

/**
 * GET /admin/fraud-alerts
 * Fraud & Risk Alert Center
 */
router.get("/fraud-alerts", async (req, res) => {
  try {
    const failedPayments = await prisma.payment.findMany({
      where: { status: "FAILED" },
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const cancelledOrders = await prisma.order.findMany({
      where: { status: "CANCELLED" },
      include: { customer: true, vendor: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    const alerts = [
      ...failedPayments.map((payment) => ({
        id: `pay-${payment.id}`,
        type: "Failed Payment",
        severity: "HIGH",
        actor: payment.order?.customer?.email || payment.order?.customer?.name || "Customer",
        detail: `Payment ${payment.reference} failed for order ${payment.orderId}`,
        timestamp: payment.createdAt,
      })),
      ...cancelledOrders.map((order) => ({
        id: `ord-${order.id}`,
        type: "Cancelled Order",
        severity: "MEDIUM",
        actor: order.customer?.email || order.customer?.name || "Customer",
        detail: `${order.vendor?.name || "Vendor"} order cancelled${order.cancelReason ? `: ${order.cancelReason}` : ""}`,
        timestamp: order.updatedAt,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load fraud alerts" });
  }
});

/**
 * Admin-wide real data feeds for Super Admin menus.
 */
router.get("/orders", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        vendor: true,
        rider: { include: { user: { select: { id: true, name: true, phone: true, email: true } } } },
        payment: true,
        dispute: true,
        review: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load orders" });
  }
});

router.get("/bookings", async (_req, res) => {
  try {
    const bookings = await emptyIfMissingTable(prisma.booking.findMany({
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        service: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }), []);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load bookings" });
  }
});

router.get("/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { vendor: { select: { id: true, name: true, category: true, area: true } }, addOns: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load products" });
  }
});

router.get("/services", async (_req, res) => {
  try {
    const services = await emptyIfMissingTable(prisma.service.findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }), []);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load services" });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const [categories, vendorGroups, productGroups, serviceGroups] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ position: "asc" }, { label: "asc" }] }),
      prisma.vendor.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.product.groupBy({ by: ["subcategory"], _count: { _all: true } }),
      emptyIfMissingTable(prisma.service.groupBy({ by: ["category"], _count: { _all: true } }), []),
    ]);
    const byName = new Map(categories.map((category) => [category.key, {
      ...category,
      name: category.label,
      vendors: 0,
      products: 0,
      services: 0,
      source: "Category",
      availableLabel: category.active ? "Active" : "Inactive",
    }]));
    vendorGroups.forEach((row) => {
      const name = row.category || "Marketplace";
      const existing = byName.get(name) || { id: `derived-vendor-${name}`, key: name, label: name, name, vendors: 0, products: 0, services: 0, source: "Derived", active: true };
      existing.vendors += row._count._all;
      byName.set(name, existing);
    });
    productGroups.filter((row) => row.subcategory).forEach((row) => {
      const name = row.subcategory;
      const existing = byName.get(name) || { id: `derived-product-${name}`, key: name, label: name, name, vendors: 0, products: 0, services: 0, source: "Derived", active: true };
      existing.products += row._count._all;
      byName.set(name, existing);
    });
    serviceGroups.forEach((row) => {
      const name = row.category || "Services";
      const existing = byName.get(name) || { id: `derived-service-${name}`, key: name, label: name, name, vendors: 0, products: 0, services: 0, source: "Derived", active: true };
      existing.services += row._count._all;
      byName.set(name, existing);
    });
    res.json(Array.from(byName.values()).sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || a.name.localeCompare(b.name)));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load categories" });
  }
});

router.get("/admins", async (_req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "MANAGER"] } },
      select: { id: true, name: true, email: true, phone: true, role: true, approved: true, suspendedAt: true, createdAt: true, locationCity: true, locationState: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load admins" });
  }
});

router.get("/notifications", async (_req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load notifications" });
  }
});

router.post("/notifications/broadcast", async (req, res) => {
  try {
    const { title, body, role = "ALL", type = "BROADCAST" } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: "Title and body are required" });
    const users = await prisma.user.findMany({
      where: role === "ALL" ? { approved: true } : { approved: true, role: String(role).toUpperCase() },
      select: { id: true },
    });
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map((user) => ({ userId: user.id, title: String(title).trim(), body: String(body).trim(), type })),
      });
    }
    await logAction(req, { action: "Sent notification broadcast", targetType: "Notification", targetId: null, targetLabel: `${role}: ${title}` });
    res.status(201).json({ ok: true, count: users.length });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to send broadcast" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, phone, role = "CUSTOMER", password, approved = true } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
    const temporaryPassword = password || generateTempPassword();
    const passwordHash = await bcrypt.hash(String(temporaryPassword), 10);
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ? String(phone).trim() : null,
        role: String(role).toUpperCase(),
        approved: !!approved,
        passwordHash,
      },
      select: { id: true, name: true, email: true, phone: true, role: true, approved: true, createdAt: true },
    });
    await logAction(req, { action: "Created user by Super Admin", targetType: "User", targetId: user.id, targetLabel: user.email });
    res.status(201).json({ ...user, temporaryPassword: password ? undefined : temporaryPassword });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create user" });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const { ownerEmail, ownerName, ownerPhone, password, name, area = "Abeokuta", category = "Local Market", eta = "20-35 min", address, emoji = "🏪", verified = true, isOpen = true } = req.body || {};
    if (!name) return res.status(400).json({ error: "Vendor name is required" });
    let owner = null;
    const temporaryPassword = ownerEmail && !password ? generateTempPassword() : null;
    if (ownerEmail) {
      owner = await prisma.user.upsert({
        where: { email: String(ownerEmail).trim().toLowerCase() },
        update: { role: "VENDOR", approved: true, suspendedAt: null, ...(ownerName ? { name: ownerName } : {}), ...(ownerPhone ? { phone: ownerPhone } : {}) },
        create: {
          name: ownerName || name,
          email: String(ownerEmail).trim().toLowerCase(),
          phone: ownerPhone || null,
          role: "VENDOR",
          approved: true,
          passwordHash: await bcrypt.hash(String(password || temporaryPassword), 10),
        },
      });
    }
    const vendor = await prisma.vendor.create({
      data: {
        ownerId: owner?.id || null,
        name: String(name).trim(),
        area,
        category,
        eta,
        address: address || null,
        emoji,
        isOpen: !!isOpen,
        verified: !!verified,
        verifiedAt: verified ? new Date() : null,
        onboardingFeeStatus: verified ? "WAIVED_BY_ADMIN" : "PENDING",
      },
      include: { owner: true, products: true },
    });
    await logAction(req, { action: "Created vendor by Super Admin", targetType: "Vendor", targetId: vendor.id, targetLabel: vendor.name });
    res.status(201).json({ ...vendor, temporaryPassword });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create vendor" });
  }
});

router.post("/riders", async (req, res) => {
  try {
    const { name, email, phone, password, zone = "Abeokuta", verified = true, isOnline = false } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: "Rider name and email are required" });
    const temporaryPassword = password || generateTempPassword();
    const user = await prisma.user.upsert({
      where: { email: String(email).trim().toLowerCase() },
      update: { name, phone: phone || null, role: "RIDER", approved: true, suspendedAt: null },
      create: {
        name,
        email: String(email).trim().toLowerCase(),
        phone: phone || null,
        role: "RIDER",
        approved: true,
        passwordHash: await bcrypt.hash(String(temporaryPassword), 10),
      },
    });
    const rider = await prisma.rider.upsert({
      where: { userId: user.id },
      update: { zone, verified: !!verified, verifiedAt: verified ? new Date() : null, isOnline: !!isOnline },
      create: { userId: user.id, zone, verified: !!verified, verifiedAt: verified ? new Date() : null, isOnline: !!isOnline },
      include: { user: true },
    });
    await logAction(req, { action: "Created rider by Super Admin", targetType: "Rider", targetId: rider.id, targetLabel: rider.user.name });
    res.status(201).json({ ...rider, temporaryPassword: password ? undefined : temporaryPassword });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create rider" });
  }
});

router.get("/hubs", async (_req, res) => {
  try {
    const hubs = await prisma.hub.findMany({
      include: { _count: { select: { agents: true, orders: true } } },
      orderBy: [{ active: "desc" }, { area: "asc" }, { name: "asc" }],
    });
    res.json(hubs);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load hubs" });
  }
});

router.post("/hubs", async (req, res) => {
  try {
    const { name, area = "Abeokuta", address, latitude, longitude, active = true } = req.body || {};
    if (!name || !address) return res.status(400).json({ error: "Hub name and address are required" });
    const hub = await prisma.hub.create({
      data: {
        name: String(name).trim(),
        area: String(area || "Abeokuta").trim(),
        address: String(address).trim(),
        latitude: latitude === undefined || latitude === null || latitude === "" ? null : Number(latitude),
        longitude: longitude === undefined || longitude === null || longitude === "" ? null : Number(longitude),
        active: !!active,
      },
    });
    await logAction(req, { action: "Created logistics hub", targetType: "Hub", targetId: hub.id, targetLabel: hub.name });
    res.status(201).json(hub);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create hub" });
  }
});

router.get("/agents", async (_req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        hub: true,
        user: { select: { id: true, name: true, email: true, phone: true, approved: true, suspendedAt: true, avatarUrl: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load agents" });
  }
});

router.post("/agents", async (req, res) => {
  try {
    const { name, email, phone, password, zone = "Abeokuta", hubId, verified = true, isOnline = false } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: "Agent name and email are required" });

    let hub = null;
    if (hubId) {
      hub = await prisma.hub.findUnique({ where: { id: hubId } });
      if (!hub) return res.status(404).json({ error: "Hub not found" });
    } else {
      hub = await prisma.hub.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
    }

    const temporaryPassword = password || generateTempPassword();
    const user = await prisma.user.upsert({
      where: { email: String(email).trim().toLowerCase() },
      update: { name, phone: phone || null, role: "AGENT", approved: true, suspendedAt: null },
      create: {
        name,
        email: String(email).trim().toLowerCase(),
        phone: phone || null,
        role: "AGENT",
        approved: true,
        passwordHash: await bcrypt.hash(String(temporaryPassword), 10),
      },
    });
    const agent = await prisma.agent.upsert({
      where: { userId: user.id },
      update: { zone, hubId: hub?.id || null, verified: !!verified, verifiedAt: verified ? new Date() : null, isOnline: !!isOnline },
      create: { userId: user.id, zone, hubId: hub?.id || null, verified: !!verified, verifiedAt: verified ? new Date() : null, isOnline: !!isOnline },
      include: { user: true, hub: true },
    });
    await logAction(req, { action: "Created agent by Super Admin", targetType: "Agent", targetId: agent.id, targetLabel: agent.user.name });
    res.status(201).json({ ...agent, temporaryPassword: password ? undefined : temporaryPassword });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create agent" });
  }
});

/**
 * GET /admin/global-search?q=...
 * Unified Global Search across Order ID, Booking ID, Customer, Vendor, Rider, Phone, Email, Transaction Ref.
 */
router.get("/global-search", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) return res.json({ orders: [], customers: [], vendors: [], riders: [] });

  const qLower = query.toLowerCase();

  try {
    const [orders, customers, vendors, riders] = await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { id: { contains: query } },
            { deliveryPhone: { contains: query } },
            { deliveryAddress: { contains: query } },
          ],
        },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          role: "CUSTOMER",
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
          ],
        },
        take: 5,
      }),
      prisma.vendor.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { area: { contains: query } },
            { category: { contains: query } },
          ],
        },
        take: 5,
      }),
      prisma.rider.findMany({
        where: {
          OR: [
            { zone: { contains: query } },
            { user: { name: { contains: query } } },
            { user: { phone: { contains: query } } },
          ],
        },
        include: { user: true },
        take: 5,
      }),
    ]);

    res.json({ orders, customers, vendors, riders });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to run global search" });
  }
});

/**
 * POST /admin/impersonate
 * Generates an impersonation support token for Super Admin to view platform as Customer/Vendor/Rider
 */
router.post("/impersonate", async (req, res) => {
  const { targetRole = "CUSTOMER", targetEmail } = req.body;
  try {
    const targetUser = await prisma.user.findFirst({
      where: {
        role: targetRole.toUpperCase(),
        ...(targetEmail ? { email: targetEmail } : {}),
      },
    });

    if (!targetUser) return res.status(404).json({ error: "Target user for impersonation not found" });

    const impersonationToken = jwt.sign(
      {
        id: targetUser.id,
        role: targetUser.role,
        email: targetUser.email,
        name: targetUser.name,
        isImpersonating: true,
        impersonatedBy: req.user.email,
      },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    await logAction(req, {
      action: "Initiated impersonation",
      targetType: targetRole,
      targetId: targetUser.id,
      targetLabel: targetUser.email,
    });

    res.json({ token: impersonationToken, user: targetUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Universal Entity Editing Endpoints for Super Admin
 */
router.patch("/users/:id", async (req, res) => {
  try {
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated user profile", targetType: "User", targetId: updated.id, targetLabel: updated.name });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/vendors/:id", async (req, res) => {
  try {
    const updated = await prisma.vendor.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated vendor details", targetType: "Vendor", targetId: updated.id, targetLabel: updated.name });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/riders/:id", async (req, res) => {
  try {
    const updated = await prisma.rider.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated rider details", targetType: "Rider", targetId: updated.id, targetLabel: updated.zone });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/hubs/:id", async (req, res) => {
  try {
    const { name, area, address, latitude, longitude, active } = req.body || {};
    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (area !== undefined) data.area = String(area).trim();
    if (address !== undefined) data.address = String(address).trim();
    if (active !== undefined) data.active = active === true || String(active).toLowerCase() === "true";
    if (latitude !== undefined) data.latitude = latitude === "" || latitude === null ? null : Number(latitude);
    if (longitude !== undefined) data.longitude = longitude === "" || longitude === null ? null : Number(longitude);

    const updated = await prisma.hub.update({
      where: { id: req.params.id },
      data,
      include: { _count: { select: { agents: true, orders: true } } },
    });
    await logAction(req, { action: "Updated logistics hub", targetType: "Hub", targetId: updated.id, targetLabel: updated.name });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message || "Failed to update hub" }); }
});

router.patch("/agents/:id", async (req, res) => {
  try {
    const { name, phone, zone, hubId, verified, isOnline, bankName, bankAccountNumber, bankAccountName } = req.body || {};
    if (hubId) {
      const hub = await prisma.hub.findUnique({ where: { id: hubId } });
      if (!hub) return res.status(404).json({ error: "Hub not found" });
    }

    const agent = await prisma.agent.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    if (name !== undefined || phone !== undefined) {
      await prisma.user.update({
        where: { id: agent.userId },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
        },
      });
    }

    const data = {};
    if (zone !== undefined) data.zone = String(zone || "Abeokuta").trim();
    if (hubId !== undefined) data.hubId = hubId || null;
    if (verified !== undefined) {
      data.verified = verified === true || String(verified).toLowerCase() === "true";
      data.verifiedAt = data.verified ? new Date() : null;
    }
    if (isOnline !== undefined) data.isOnline = isOnline === true || String(isOnline).toLowerCase() === "true";
    if (bankName !== undefined) data.bankName = bankName || null;
    if (bankAccountNumber !== undefined) data.bankAccountNumber = bankAccountNumber || null;
    if (bankAccountName !== undefined) data.bankAccountName = bankAccountName || null;

    const updated = await prisma.agent.update({
      where: { id: req.params.id },
      data,
      include: {
        hub: true,
        user: { select: { id: true, name: true, email: true, phone: true, approved: true, suspendedAt: true, avatarUrl: true } },
        _count: { select: { orders: true } },
      },
    });
    await logAction(req, { action: "Updated agent details", targetType: "Agent", targetId: updated.id, targetLabel: updated.user?.name || updated.zone });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message || "Failed to update agent" }); }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const updated = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated product details", targetType: "Product", targetId: updated.id, targetLabel: updated.name });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/services/:id", async (req, res) => {
  try {
    const updated = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated service details", targetType: "Service", targetId: updated.id, targetLabel: updated.name });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/orders/:id", async (req, res) => {
  try {
    const updated = await prisma.order.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated order details", targetType: "Order", targetId: updated.id, targetLabel: `#${updated.id.slice(-6)}` });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/bookings/:id", async (req, res) => {
  try {
    const updated = await prisma.booking.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated booking details", targetType: "Booking", targetId: updated.id, targetLabel: `#${updated.id.slice(-6)}` });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/locations/:id", async (req, res) => {
  try {
    const updated = await prisma.location.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated location details", targetType: "Location", targetId: updated.id, targetLabel: updated.name });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/categories/:id", async (req, res) => {
  try {
    const data = categoryPayload(req.body);
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const updated = await prisma.category.update({ where: { id: req.params.id }, data });
    await logAction(req, { action: "Updated category details", targetType: "Category", targetId: updated.id, targetLabel: updated.label });
    res.json(updated);
  } catch (err) { res.status(err.statusCode || 400).json({ error: err.message }); }
});

router.put("/marketplace/divisions/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const data = categoryPayload({ ...req.body, type: "DIVISION", parentId: null });
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const updated = await prisma.category.update({ where: { id: req.params.id }, data: { ...data, divisionId: null } });
    await logAction(req, { action: "Updated marketplace division", targetType: "Category", targetId: updated.id, targetLabel: updated.label });
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message || "Failed to update marketplace division" });
  }
});

router.put("/marketplace/categories/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const data = categoryPayload(req.body);
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const updated = await prisma.category.update({ where: { id: req.params.id }, data });
    await logAction(req, { action: "Updated marketplace category", targetType: "Category", targetId: updated.id, targetLabel: updated.label });
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message || "Failed to update marketplace category" });
  }
});

router.delete("/marketplace/divisions/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: { active: false, showOnHomepage: false, deletedAt: new Date() },
    });
    await prisma.category.updateMany({
      where: { OR: [{ divisionId: req.params.id }, { parentId: req.params.id }] },
      data: { active: false, showOnHomepage: false },
    });
    await logAction(req, { action: "Deleted marketplace division", targetType: "Category", targetId: updated.id, targetLabel: updated.label });
    res.json({ ok: true, category: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to delete marketplace division" });
  }
});

router.delete("/marketplace/categories/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: { active: false, showOnHomepage: false, deletedAt: new Date() },
    });
    await logAction(req, { action: "Deleted marketplace category", targetType: "Category", targetId: updated.id, targetLabel: updated.label });
    res.json({ ok: true, category: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to delete marketplace category" });
  }
});

router.patch("/commissions/:id", async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.ratePercent !== undefined) {
      const parsedRate = Number(data.ratePercent);
      if (!Number.isFinite(parsedRate) || parsedRate < 0) {
        return res.status(400).json({ error: "Enter a valid fee percentage" });
      }
      data.ratePercent = parsedRate;
    }
    const updated = await prisma.commissionRule.update({ where: { id: req.params.id }, data });
    await logAction(req, { action: "Updated commission rule", targetType: "CommissionRule", targetId: updated.id, targetLabel: `${updated.ratePercent}%` });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/promotions/:id", async (req, res) => {
  try {
    const data = promotionPayload(req.body);
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const updated = await prisma.promotion.update({ where: { id: req.params.id }, data });
    await logAction(req, { action: "Updated promotion details", targetType: "Promotion", targetId: updated.id, targetLabel: updated.code });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/tickets/:id", async (req, res) => {
  try {
    const updated = await prisma.supportTicket.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated support ticket", targetType: "SupportTicket", targetId: updated.id, targetLabel: updated.ticketNumber });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch("/refunds/:id", async (req, res) => {
  try {
    const updated = await prisma.refund.update({ where: { id: req.params.id }, data: req.body });
    await logAction(req, { action: "Updated refund status", targetType: "Refund", targetId: updated.id, targetLabel: updated.status });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/**
 * GET /admin/contact-inquiries
 */
router.get("/contact-inquiries", async (req, res) => {
  try {
    const inquiries = await prisma.contactInquiry.findMany({ orderBy: { createdAt: "desc" } });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /admin/contact-inquiries/:id/status
 */
router.patch("/contact-inquiries/:id/status", async (req, res) => {
  try {
    const { status, replyNote } = req.body;
    const data = {};
    if (status) data.status = status;
    if (replyNote !== undefined) data.replyNote = replyNote;

    const updated = await prisma.contactInquiry.update({ where: { id: req.params.id }, data });
    broadcastContactUpdate(updated);
    await logAction(req, {
      action: `Updated contact inquiry status to ${status || updated.status}`,
      targetType: "ContactInquiry",
      targetId: updated.id,
      targetLabel: updated.subject,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /admin/contact-inquiries/:id
 */
router.delete("/contact-inquiries/:id", async (req, res) => {
  try {
    await prisma.contactInquiry.delete({ where: { id: req.params.id } });
    broadcastContactUpdate({ id: req.params.id, _deleted: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /admin/contact-settings
 */
router.get("/contact-settings", async (req, res) => {
  try {
    let config = await prisma.contactConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.contactConfig.create({
        data: {
          id: "default",
          supportPhone: "+234 800 NEEDLY",
          supportEmail: "support@needly.market",
          whatsappNumber: "+234 803 123 4567",
          officeAddress: "Panseke Commercial Hub, Abeokuta, Ogun State",
          operatingHours: "24/7 Everyday",
        },
      });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /admin/contact-settings
 */
router.patch("/contact-settings", async (req, res) => {
  try {
    const { supportPhone, supportEmail, whatsappNumber, officeAddress, operatingHours } = req.body;
    const config = await prisma.contactConfig.upsert({
      where: { id: "default" },
      update: {
        ...(supportPhone && { supportPhone }),
        ...(supportEmail && { supportEmail }),
        ...(whatsappNumber && { whatsappNumber }),
        ...(officeAddress && { officeAddress }),
        ...(operatingHours && { operatingHours }),
      },
      create: {
        id: "default",
        supportPhone: supportPhone || "+234 800 NEEDLY",
        supportEmail: supportEmail || "support@needly.market",
        whatsappNumber: whatsappNumber || "+234 803 123 4567",
        officeAddress: officeAddress || "Panseke Commercial Hub, Abeokuta, Ogun State",
        operatingHours: operatingHours || "24/7 Everyday",
      },
    });

    broadcastContactSettings(config);
    await logAction(req, {
      action: "Updated platform real-time contact settings",
      targetType: "ContactConfig",
      targetId: config.id,
      targetLabel: config.supportPhone,
    });
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
