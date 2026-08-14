const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /reviews — customer rates a delivered order (one per order,
 * enforced by the schema's unique orderId). vendorRating is required;
 * riderRating only makes sense if a rider actually delivered it.
 */
router.post("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { orderId, vendorRating, riderRating, comment } = req.body;
  if (!orderId || !vendorRating || vendorRating < 1 || vendorRating > 5) {
    return res.status(400).json({ error: "orderId and a vendorRating from 1-5 are required" });
  }
  if (riderRating !== undefined && riderRating !== null && (riderRating < 1 || riderRating > 5)) {
    return res.status(400).json({ error: "riderRating must be 1-5 if provided" });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { review: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.customerId !== req.user.id) return res.status(403).json({ error: "Not your order" });
  if (order.status !== "DELIVERED") return res.status(400).json({ error: "Can only review delivered orders" });
  if (order.review) return res.status(400).json({ error: "This order has already been reviewed" });

  const review = await prisma.review.create({
    data: {
      orderId, customerId: req.user.id, vendorId: order.vendorId, riderId: order.riderId || null,
      vendorRating, riderRating: riderRating || null, comment: comment || null,
    },
  });
  res.status(201).json(review);
});

module.exports = router;
