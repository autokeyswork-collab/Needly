const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

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
  const { category } = req.query;
  const vendors = await prisma.vendor.findMany({
    where: {
      ...(category ? { category } : {}),
      OR: [
        { ownerId: { not: null }, owner: { approved: true } },
        { managerId: { not: null }, manager: { approved: true } },
      ],
    },
    include: { products: { include: { addOns: true } } },
    orderBy: { name: "asc" },
  });

  // One grouped query for every vendor's review stats, not one query per
  // vendor — real reviews blend into the displayed rating instead of it
  // being a permanently static seed number.
  const reviewStats = await prisma.review.groupBy({ by: ["vendorId"], _sum: { vendorRating: true }, _count: true });
  const statsByVendor = Object.fromEntries(reviewStats.map((s) => [s.vendorId, s]));
  const withBlendedRatings = vendors.map((v) => {
    const stats = statsByVendor[v.id];
    return { ...v, rating: blend(v.rating, stats?._sum.vendorRating || 0, stats?._count || 0) };
  });
  res.json(withBlendedRatings);
});

/**
 * GET /vendors/admin/all — admin-only roster with owner/manager contact
 * info, for account management. Separate from the public GET / above,
 * which deliberately doesn't expose owner PII to anyone browsing.
 * Registered before GET /:id so "admin" isn't swallowed as a vendor id.
 */
router.get("/admin/all", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const vendors = await prisma.vendor.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true, approved: true } },
      manager: { select: { id: true, name: true, email: true, phone: true, approved: true } },
      products: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json(vendors.map((v) => ({
    ...v,
    isActive: !((v.owner && !v.owner.approved) || (v.manager && !v.manager.approved)),
  })));
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
  if (!isOwner && !isManager && req.user.role !== "ADMIN") {
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

/** POST /vendors/:id/products — add a new product. */
router.post("/:id/products", requireAuth, requireRole("VENDOR", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const { name, price, emoji, subcategory } = req.body;
  if (!name || !price) return res.status(400).json({ error: "name and price are required" });

  const product = await prisma.product.create({
    data: { vendorId: req.params.id, name, price, emoji: emoji || "🍽️", subcategory },
  });
  res.status(201).json(product);
});

/** PATCH /vendors/:vendorId/products/:productId — update price (or name/emoji). */
router.patch("/:vendorId/products/:productId", requireAuth, requireRole("VENDOR", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const { price, name, emoji } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.productId },
    data: {
      ...(price !== undefined ? { price } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(emoji !== undefined ? { emoji } : {}),
    },
  });
  res.json(product);
});

/** POST /vendors/:vendorId/products/:productId/addons — add an add-on option. */
router.post("/:vendorId/products/:productId/addons", requireAuth, requireRole("VENDOR", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: "name and price are required" });

  const addOn = await prisma.productAddOn.create({
    data: { productId: req.params.productId, name, price },
  });
  res.status(201).json(addOn);
});

/** PATCH /vendors/:vendorId/products/:productId/available — toggle one product's availability. */
router.patch("/:vendorId/products/:productId/available", requireAuth, requireRole("VENDOR", "ADMIN"), assertOwnsVendor, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product || product.vendorId !== req.vendor.id) return res.status(404).json({ error: "Product not found" });

  const updated = await prisma.product.update({
    where: { id: req.params.productId },
    data: { isAvailable: !product.isAvailable },
  });
  res.json(updated);
});

/** DELETE /vendors/:vendorId/products/:productId/addons/:addOnId */
router.delete("/:vendorId/products/:productId/addons/:addOnId", requireAuth, requireRole("VENDOR", "ADMIN"), assertOwnsVendor, async (req, res) => {
  await prisma.productAddOn.delete({ where: { id: req.params.addOnId } });
  res.json({ ok: true });
});

/**
 * PATCH /vendors/:id/admin-edit — admin edits store-level fields
 * (owner/manager contact info goes through PATCH /auth/users/:id/contact
 * instead, since that's a User field, not a Vendor field).
 */
router.patch("/:id/admin-edit", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, category, area, eta, emoji } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category;
  if (area !== undefined) data.area = area;
  if (eta !== undefined) data.eta = eta;
  if (emoji !== undefined) data.emoji = emoji;
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
