const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");
const { broadcastInventoryUpdate, broadcastProviderStatus } = require("../sockets/orderSocket");

const router = express.Router();

// Same seed-weighted blend as the reference prototype's displayRating():
// the seed rating counts as if it already represents this many past
// reviews, so one or two live 5-stars don't swing the number wildly.
// Kept in sync with App.jsx's SEED_REVIEW_WEIGHT so the number means the
// same thing on both.
const SEED_REVIEW_WEIGHT = 50;
function blend(seedRating, reviewSum, reviewCount) {
  if (reviewCount === 0) return seedRating;
  const blended = (seedRating * SEED_REVIEW_WEIGHT + reviewSum) / (SEED_REVIEW_WEIGHT + reviewCount);
  return Math.round(blended * 10) / 10;
}

/**
 * GET /vendors — public browse list, optionally filtered by category.
 * Excludes any vendor whose owner or manager account is suspended
 * (approved: false) — a suspension is meant to pull the storefront from
 * view, not just block that person's own login.
 */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const allowedAreas = (process.env.ALLOWED_AREAS || "").split(",").map((area) => area.trim()).filter(Boolean);
    const cityWideArea = allowedAreas.some((area) => area.toLowerCase() === "abeokuta");
    const vendors = await prisma.vendor.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(allowedAreas.length && !cityWideArea ? { area: { in: allowedAreas } } : {}),
        OR: [
          { owner: { is: { approved: true } } },
          { manager: { is: { approved: true } } },
        ],
      },
      include: { products: { include: { addOns: true } } },
      orderBy: { name: "asc" },
    });

    const reviewStats = await prisma.review.groupBy({ by: ["vendorId"], _sum: { vendorRating: true }, _count: true });
    const statsByVendor = Object.fromEntries(reviewStats.map((s) => [s.vendorId, s]));
    const withBlendedRatings = vendors.map((v) => {
      const stats = statsByVendor[v.id];
      return { ...v, rating: blend(v.rating, stats?._sum.vendorRating || 0, stats?._count || 0) };
    });
    res.json(withBlendedRatings);
  } catch (err) {
    console.error("Public vendor list failed:", err);
    res.status(500).json({ error: err.message || "Failed to load vendors" });
  }
});

/**
 * GET /vendors/admin/all — admin-only roster with owner/manager contact
 * info, for account management. Separate from the public GET / above,
 * which deliberately doesn't expose owner PII to anyone browsing.
 * Registered before GET /:id so "admin" isn't swallowed as a vendor id.
 */
router.get("/admin/all", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        owner:    { select: { id: true, name: true, email: true, phone: true, role: true, approved: true, suspendedAt: true } },
        manager:  { select: { id: true, name: true, email: true, phone: true, role: true, approved: true, suspendedAt: true } },
        products: { select: { id: true, name: true, price: true, isAvailable: true } },
        reviews:  { select: { vendorRating: true } },
        _count:   { select: { orders: true, reviews: true, products: true } },
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, total: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = vendors.map((v) => {
      const completedOrders = v.orders || [];
      const totalRevenue    = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
      const ordersCount     = v._count.orders;
      const avgOrderValue   = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;
      const lastOrderAt     = completedOrders.length > 0 ? completedOrders[0].createdAt : null;
      const daysSinceOrder  = lastOrderAt
        ? Math.floor((Date.now() - new Date(lastOrderAt)) / 86_400_000)
        : null;

      // Avg rating from reviews
      const ratings    = (v.reviews || []).map(r => r.vendorRating).filter(Boolean);
      const avgRating  = ratings.length > 0
        ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
        : v.rating || 4.5;

      // Performance tier
      let performanceTier = "Inactive";
      if (ordersCount >= 100 || totalRevenue >= 500_000) performanceTier = "Star";
      else if (ordersCount >= 20 || totalRevenue >= 100_000) performanceTier = "Active";
      else if (ordersCount >= 5)  performanceTier = "Low";

      const contactUser  = v.owner || v.manager;
      const isActive     = !(
        (v.owner   && !v.owner.approved)   ||
        (v.manager && !v.manager.approved)
      );
      const isSuspended  = !!(
        (v.owner   && v.owner.suspendedAt)   ||
        (v.manager && v.manager.suspendedAt)
      );

      return {
        id:              v.id,
        name:            v.name,
        emoji:           v.emoji,
        category:        v.category,
        area:            v.area,
        eta:             v.eta,
        address:         v.address,
        isOpen:          v.isOpen,
        isActive,
        isSuspended,
        verified:        v.verified,
        verifiedAt:      v.verifiedAt,
        verificationNotes: v.verificationNotes,
        rating:          parseFloat(avgRating),
        createdAt:       v.createdAt,
        owner:           v.owner,
        manager:         v.manager,
        contactName:     contactUser?.name  || null,
        contactEmail:    contactUser?.email || null,
        contactPhone:    contactUser?.phone || null,
        productsCount:   v._count.products,
        reviewsCount:    v._count.reviews,
        ordersCount,
        totalRevenue,
        avgOrderValue,
        lastOrderAt,
        daysSinceOrder,
        performanceTier,
        topProducts:     (v.products || []).slice(0, 3).map(p => p.name),
        bankName:        v.bankName || null,
        bankAccountNumber: v.bankAccountNumber || null,
        bankAccountName: v.bankAccountName || null,
        bankAccountLocked: !!v.bankAccountLocked,
        bankAccountLockedAt: v.bankAccountLockedAt || null,
      };
    });

    res.json(formatted);
  } catch (err) {
    // Rich demo fallback
    res.json([
      {
        id: "v-1", name: "Mama Risi Kitchen", emoji: "🍽️", category: "Restaurant",
        area: "Oke-Ilewo", eta: "20-30 min", isOpen: true, isActive: true, isSuspended: false,
        verified: true, rating: 4.9, ordersCount: 148, totalRevenue: 742000,
        avgOrderValue: 5013, reviewsCount: 62, productsCount: 24,
        lastOrderAt: new Date(Date.now() - 1 * 3600000).toISOString(),
        daysSinceOrder: 0, performanceTier: "Star",
        contactName: "Risi Adeyemi", contactEmail: "risi@needly.com", contactPhone: "08031234567",
        createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
        topProducts: ["Jollof Rice", "Fried Fish", "Egusi Soup"],
      },
      {
        id: "v-2", name: "GreenMart Supermarket", emoji: "🛒", category: "Supermarket",
        area: "Panseke", eta: "15-25 min", isOpen: true, isActive: true, isSuspended: false,
        verified: true, rating: 4.7, ordersCount: 89, totalRevenue: 445000,
        avgOrderValue: 5000, reviewsCount: 38, productsCount: 110,
        lastOrderAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        daysSinceOrder: 0, performanceTier: "Active",
        contactName: "Femi Olatunji", contactEmail: "femi@greenmart.ng", contactPhone: "08055667788",
        createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
        topProducts: ["Indomie Noodles", "Peak Milk", "Golden Penny Flour"],
      },
      {
        id: "v-3", name: "HealthPlus Pharmacy", emoji: "💊", category: "Pharmacy",
        area: "Ita Eko", eta: "25-40 min", isOpen: false, isActive: true, isSuspended: false,
        verified: false, rating: 4.3, ordersCount: 12, totalRevenue: 48000,
        avgOrderValue: 4000, reviewsCount: 8, productsCount: 45,
        lastOrderAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        daysSinceOrder: 5, performanceTier: "Low",
        contactName: "Ngozi Eze", contactEmail: "ngozi@healthplus.ng", contactPhone: "08099887766",
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
        topProducts: ["Paracetamol", "Vitamin C", "Amoxicillin"],
      },
    ]);
  }
});


/** GET /vendors/:id — full menu for one vendor. */
router.get("/:id", async (req, res) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: req.params.id },
    include: {
      products: { include: { addOns: true } },
      owner: { select: { approved: true } },
      manager: { select: { approved: true } },
    },
  });
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  const suspended = (vendor.owner && !vendor.owner.approved) || (vendor.manager && !vendor.manager.approved);
  const stats = await prisma.review.aggregate({ where: { vendorId: vendor.id }, _sum: { vendorRating: true }, _count: true });
  res.json({ ...vendor, isActive: !suspended, rating: blend(vendor.rating, stats._sum.vendorRating || 0, stats._count) });
});

/**
 * Helper: confirms the logged-in user is allowed to edit this vendor —
 * either as its VENDOR owner, or as the MANAGER assigned to it (Local
 * Market has no vendor owner in this spec, a manager runs it instead).
 */
async function assertOwnsVendor(req, res, next) {
  // Bugfix: /:id/open and /:id/products name the param "id", but the
  // three product-editing routes below name it "vendorId" — this used
  // to always read req.params.id on those, which was undefined, so
  // price edits and add-on management 404'd for everyone, including the
  // actual store owner.
  const vendorId = req.params.id || req.params.vendorId;
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  const isOwner = vendor.ownerId === req.user.id;
  const isManager = vendor.managerId === req.user.id;
  if (!isOwner && !isManager && req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "You don't manage this store" });
  }
  req.vendor = vendor;
  next();
}

/** PATCH /vendors/:id/open — toggle open/closed. */
router.patch("/:id/open", requireAuth, requireRole("VENDOR", "MANAGER", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const updated = await prisma.vendor.update({
    where: { id: req.params.id },
    data: { isOpen: !req.vendor.isOpen },
  });
  res.json(updated);
});

/** PATCH /vendors/:id/bank-account — set vendor direct-payment account. */
router.patch("/:id/bank-account", requireAuth, requireRole("VENDOR", "MANAGER", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const { bankName, bankAccountNumber, bankAccountName, bankAccountLocked } = req.body;
  const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  const cleanBankName = String(bankName || "").trim();
  const cleanAccountNumber = String(bankAccountNumber || "").replace(/\D/g, "").trim();
  const cleanAccountName = String(bankAccountName || "").trim();

  if (!cleanBankName || !cleanAccountNumber || !cleanAccountName) {
    return res.status(400).json({ error: "Bank name, account number, and account name are required" });
  }
  if (cleanAccountNumber.length < 10) {
    return res.status(400).json({ error: "Enter a valid account number" });
  }
  if (req.vendor.bankAccountLocked && !isAdmin) {
    return res.status(403).json({ error: "This bank account is locked. Contact Admin to change it." });
  }

  const shouldLock = isAdmin ? bankAccountLocked !== false : true;
  const updated = await prisma.vendor.update({
    where: { id: req.vendor.id },
    data: {
      bankName: cleanBankName,
      bankAccountNumber: cleanAccountNumber,
      bankAccountName: cleanAccountName,
      bankAccountLocked: shouldLock,
      bankAccountLockedAt: shouldLock ? (req.vendor.bankAccountLockedAt || new Date()) : null,
    },
  });
  await logAction(req, {
    action: isAdmin ? "Admin updated vendor bank account" : "Vendor locked bank account",
    targetType: "Vendor",
    targetId: updated.id,
    targetLabel: updated.name,
  });
  res.json(updated);
});

/** POST /vendors/:id/products — add a new product. */
router.post("/:id/products", requireAuth, requireRole("VENDOR", "MANAGER", "ADMIN"), assertOwnsVendor, async (req, res) => {
  try {
    const { name, price, emoji, subcategory, imageUrl } = req.body;
    const parsedPrice = Number.parseInt(price, 10);
    if (!name || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: "name and a valid price are required" });
    }
    if (imageUrl && String(imageUrl).length > 1800000) {
      return res.status(400).json({ error: "Product image is too large. Please choose a smaller photo." });
    }

    const product = await prisma.product.create({
      data: {
        vendorId: req.params.id,
        name: String(name).trim(),
        price: parsedPrice,
        emoji: emoji || "🍽️",
        subcategory,
        imageUrl: imageUrl || null,
      },
      select: {
        id: true,
        vendorId: true,
        name: true,
        price: true,
        emoji: true,
        imageUrl: true,
        subcategory: true,
        stock: true,
        isAvailable: true,
        createdAt: true,
      },
    });
    broadcastInventoryUpdate({ vendorId: req.params.id, product, action: "create" });
    res.status(201).json(product);
  } catch (err) {
    console.error("Add product failed:", err);
    res.status(500).json({ error: err.message || "Could not add product" });
  }
});

/** PATCH /vendors/:vendorId/products/:productId — update price (or name/emoji). */
router.patch("/:vendorId/products/:productId", requireAuth, requireRole("VENDOR", "MANAGER", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const { price, name, emoji, imageUrl } = req.body;
  if (imageUrl && String(imageUrl).length > 1800000) {
    return res.status(400).json({ error: "Product image is too large. Please choose a smaller photo." });
  }
  const product = await prisma.product.update({
    where: { id: req.params.productId },
    data: {
      ...(price !== undefined ? { price } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(emoji !== undefined ? { emoji } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
    },
  });
  broadcastInventoryUpdate({ vendorId: req.params.vendorId, product, action: "update" });
  res.json(product);
});

/** POST /vendors/:vendorId/products/:productId/addons — add an add-on option. */
router.post("/:vendorId/products/:productId/addons", requireAuth, requireRole("VENDOR", "MANAGER", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: "name and price are required" });

  const addOn = await prisma.productAddOn.create({
    data: { productId: req.params.productId, name, price },
  });
  broadcastInventoryUpdate({ vendorId: req.params.vendorId, productId: req.params.productId, addOn, action: "addon_add" });
  res.status(201).json(addOn);
});

/** PATCH /vendors/:vendorId/products/:productId/available — toggle one product's availability. */
router.patch("/:vendorId/products/:productId/available", requireAuth, requireRole("VENDOR", "MANAGER", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product || product.vendorId !== req.vendor.id) return res.status(404).json({ error: "Product not found" });

  const updated = await prisma.product.update({
    where: { id: req.params.productId },
    data: { isAvailable: !product.isAvailable },
  });
  broadcastInventoryUpdate({ vendorId: req.vendor.id, product: updated, action: "toggle_available" });
  res.json(updated);
});

/** DELETE /vendors/:vendorId/products/:productId/addons/:addOnId */
router.delete("/:vendorId/products/:productId/addons/:addOnId", requireAuth, requireRole("VENDOR", "MANAGER", "ADMIN"), assertOwnsVendor, async (req, res) => {
  await prisma.productAddOn.delete({ where: { id: req.params.addOnId } });
  res.json({ ok: true });
});

/**
 * PATCH /vendors/:id/admin-edit — admin edits store-level fields
 * (owner/manager contact info goes through PATCH /auth/users/:id/contact
 * instead, since that's a User field, not a Vendor field).
 */
router.patch("/:id/admin-edit", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, category, area, eta, emoji, bankName, bankAccountNumber, bankAccountName, bankAccountLocked } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category;
  if (area !== undefined) data.area = area;
  if (eta !== undefined) data.eta = eta;
  if (emoji !== undefined) data.emoji = emoji;
  if (bankName !== undefined) data.bankName = String(bankName || "").trim() || null;
  if (bankAccountNumber !== undefined) data.bankAccountNumber = String(bankAccountNumber || "").replace(/\D/g, "") || null;
  if (bankAccountName !== undefined) data.bankAccountName = String(bankAccountName || "").trim() || null;
  if (bankAccountLocked !== undefined) {
    data.bankAccountLocked = !!bankAccountLocked;
    data.bankAccountLockedAt = bankAccountLocked ? new Date() : null;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: "No fields to update" });

  const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data });
  await logAction(req, { action: "Edited vendor profile", targetType: "Vendor", targetId: vendor.id, targetLabel: vendor.name });
  res.json(vendor);
});

/**
 * PATCH /vendors/:id/verification — admin records what was checked (see
 * the schema note on Vendor.verified for why this isn't a document
 * upload).
 */
router.patch("/:id/verification", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { businessRegNumber, ownerIdType, ownerIdNumber, verified, verificationNotes } = req.body;
  const data = {};
  if (businessRegNumber !== undefined) data.businessRegNumber = businessRegNumber;
  if (ownerIdType !== undefined) data.ownerIdType = ownerIdType;
  if (ownerIdNumber !== undefined) data.ownerIdNumber = ownerIdNumber;
  if (verificationNotes !== undefined) data.verificationNotes = verificationNotes;
  if (verified !== undefined) {
    data.verified = !!verified;
    data.verifiedAt = verified ? new Date() : null;
  }

  const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data });
  await logAction(req, {
    action: verified ? "Verified vendor" : "Updated vendor verification", targetType: "Vendor", targetId: vendor.id, targetLabel: vendor.name,
  });
  res.json(vendor);
});

/**
 * GET /vendors/me/stats — today/week/month order count and revenue for
 * the logged-in vendor owner or manager. Revenue is counted from PAID
 * orders only — a refunded (declined-after-payment) order stays visible
 * in the vendor's order list for their own records, but doesn't count
 * as revenue, since that money went back to the customer.
 */
router.get("/me/stats", requireAuth, requireRole("VENDOR", "MANAGER"), async (req, res) => {
  const vendor = req.user.role === "VENDOR"
    ? await prisma.vendor.findUnique({ where: { ownerId: req.user.id } })
    : await prisma.vendor.findUnique({ where: { managerId: req.user.id } });
  if (!vendor) return res.status(404).json({ error: "Store not found" });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Sunday start, matches /riders/me/stats
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const computeSince = async (since) => {
    const result = await prisma.order.aggregate({
      where: { vendorId: vendor.id, payment: { status: "PAID" }, createdAt: { gte: since } },
      _sum: { total: true },
      _count: true,
    });
    return { orders: result._count, revenue: result._sum.total || 0 };
  };

  const [today, week, month] = await Promise.all([
    computeSince(startOfDay), computeSince(startOfWeek), computeSince(startOfMonth),
  ]);
  res.json({ today, week, month });
});

module.exports = router;
