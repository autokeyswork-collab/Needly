const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { broadcastBookingUpdate, broadcastNotification, broadcastAdminAlert } = require("../sockets/orderSocket");

const router = express.Router();

const DEMO_BOOKINGS = [];

/** POST /bookings — Create a new service booking. */
router.post("/", requireAuth, async (req, res) => {
  const { serviceId, providerName, address, phone, total, scheduledAt } = req.body;

  if (!address || !phone || !total) {
    return res.status(400).json({ error: "Address, phone, and total are required" });
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id,
        serviceId: serviceId || "srv-default",
        providerName: providerName || "Needly Certified Provider",
        address,
        phone,
        total: parseInt(total, 10),
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
    // In-memory fallback
    const mockBooking = {
      id: `bk-${Date.now()}`,
      customerId: req.user.id,
      serviceId: serviceId || "srv-1",
      providerName: providerName || "Abeokuta Auto / Home Service",
      status: "PENDING",
      address,
      phone,
      total: parseInt(total, 10),
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    DEMO_BOOKINGS.unshift(mockBooking);
    broadcastBookingUpdate(mockBooking);
    return res.status(201).json(mockBooking);
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
    return res.json(DEMO_BOOKINGS.filter((b) => req.user.role === "ADMIN" || b.customerId === req.user.id));
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
    const match = DEMO_BOOKINGS.find((b) => b.id === req.params.id);
    if (match) {
      match.status = status.toUpperCase();
      broadcastBookingUpdate(match);
      return res.json(match);
    }
    return res.json({ id: req.params.id, status: status.toUpperCase() });
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
    const match = DEMO_BOOKINGS.find((b) => b.id === req.params.id);
    if (match) {
      match.status = "CANCELLED";
      match.cancelReason = reason || "Cancelled by user";
      broadcastBookingUpdate(match);
      return res.json(match);
    }
    return res.json({ id: req.params.id, status: "CANCELLED" });
  }
});

module.exports = router;
