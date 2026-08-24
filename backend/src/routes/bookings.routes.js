const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { broadcastBookingUpdate, broadcastNotification, broadcastAdminAlert } = require("../sockets/orderSocket");

const router = express.Router();

function publicService(service, provider = null) {
  return {
    id: service.id,
    providerId: service.providerId,
    providerName: provider?.name || service.providerId,
    providerArea: provider?.area || null,
    providerEta: provider?.eta || null,
    providerRating: provider?.rating || null,
    providerAddress: provider?.address || null,
    name: service.name,
    category: service.category,
    price: service.price,
    description: service.description || null,
    emoji: service.emoji,
    isAvailable: service.isAvailable,
    createdAt: service.createdAt,
  };
}

/** GET /bookings/services — database-backed service provider list. */
router.get("/services", async (req, res) => {
  const category = String(req.query.category || "").trim();
  try {
    const services = await prisma.service.findMany({
      where: {
        isAvailable: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { providerId: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    const providerIds = Array.from(new Set(services.map((service) => service.providerId).filter(Boolean)));
    const vendors = providerIds.length
      ? await prisma.vendor.findMany({
        where: { id: { in: providerIds }, owner: { approved: true, suspendedAt: null } },
        select: { id: true, name: true, area: true, eta: true, rating: true, address: true },
      })
      : [];
    const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    res.json(services.map((service) => publicService(service, vendorsById.get(service.providerId))));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load services" });
  }
});

/** POST /bookings — Create a new service booking. */
router.post("/", requireAuth, async (req, res) => {
  const { serviceId, providerName, address, phone, total, scheduledAt } = req.body;

  if (!serviceId || !address || !phone) {
    return res.status(400).json({ error: "Service, address, and phone are required" });
  }

  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isAvailable) return res.status(404).json({ error: "Service is not available" });
    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id,
        serviceId: service.id,
        providerName: providerName || service.providerId,
        address,
        phone,
        total: parseInt(total || service.price, 10),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: "PENDING",
      },
    });

    broadcastBookingUpdate(booking);
    broadcastNotification(req.user.id, {
      title: "Booking Requested",
      body: `Your booking for ${booking.providerName} has been submitted.`,
    });
    broadcastAdminAlert({ type: "booking_created", bookingId: booking.id });

    return res.status(201).json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create booking" });
  }
});

/** GET /bookings/mine — Fetch bookings for logged in user. */
router.get("/mine", requireAuth, async (req, res) => {
  try {
    let bookings = [];
    if (req.user.role === "ADMIN") {
      bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });
    } else {
      bookings = await prisma.booking.findMany({
        where: { customerId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
    }
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to load bookings" });
  }
});

/** PATCH /bookings/:id/status — Transition booking status. */
router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: status.toUpperCase() },
    });
    broadcastBookingUpdate(updated);
    broadcastNotification(updated.customerId, {
      title: "Booking Status Update",
      body: `Your booking with ${updated.providerName} is now ${updated.status}.`,
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to update booking" });
  }
});

/** PATCH /bookings/:id/cancel — Cancel booking with reason. */
router.patch("/:id/cancel", requireAuth, async (req, res) => {
  const { reason } = req.body;
  try {
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED", cancelReason: reason || "Cancelled by user" },
    });
    broadcastBookingUpdate(updated);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to cancel booking" });
  }
});

module.exports = router;
