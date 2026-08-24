const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { getJwtSecret } = require("../lib/jwtSecret");

let ioInstance = null;

function setupSockets(httpServer) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  ioInstance = new Server(httpServer, {
    cors: { origin: allowedOrigins.length ? allowedOrigins : true },
  });

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      socket.user = jwt.verify(token, getJwtSecret());
      next();
    } catch (err) {
      next(new Error("Invalid auth token"));
    }
  });

  ioInstance.on("connection", async (socket) => {
    const userId = socket.user.id;
    const role = socket.user.role;

    // Join personal user room
    socket.join(`user:${userId}`);

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      socket.join("admin:dashboard");
    }

    if (role === "RIDER") {
      socket.join("riders:online");
    }

    if (role === "VENDOR" || role === "MANAGER") {
      try {
        const vendor = role === "VENDOR"
          ? await prisma.vendor.findUnique({ where: { ownerId: userId } })
          : await prisma.vendor.findUnique({ where: { managerId: userId } });
        if (vendor) socket.join(`vendor:${vendor.id}`);
      } catch (e) {}
    }

    // Room subscription events
    socket.on("order:watch", (orderId) => socket.join(`order:${orderId}`));
    socket.on("order:unwatch", (orderId) => socket.leave(`order:${orderId}`));

    socket.on("booking:watch", (bookingId) => socket.join(`booking:${bookingId}`));
    socket.on("booking:unwatch", (bookingId) => socket.leave(`booking:${bookingId}`));
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function broadcastOrderUpdate(order) {
  if (!ioInstance) return;
  ioInstance.to(`order:${order.id}`).emit("order:updated", order);
  if (order.customerId) ioInstance.to(`user:${order.customerId}`).emit("order:updated", order);
  if (order.vendorId) ioInstance.to(`vendor:${order.vendorId}`).emit("order:updated", order);
  ioInstance.to("admin:dashboard").emit("order:updated", order);
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "order", id: order.id, at: new Date().toISOString() });
  if (order.status === "READY" || order.status === "PLACED") {
    ioInstance.to("riders:online").emit("order:available", order);
  }
}

function broadcastBookingUpdate(booking) {
  if (!ioInstance) return;
  ioInstance.to(`booking:${booking.id}`).emit("booking:updated", booking);
  if (booking.customerId) ioInstance.to(`user:${booking.customerId}`).emit("booking:updated", booking);
  if (booking.providerId) ioInstance.to(`user:${booking.providerId}`).emit("booking:updated", booking);
  ioInstance.to("admin:dashboard").emit("booking:updated", booking);
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "booking", id: booking.id, at: new Date().toISOString() });
}

function broadcastProviderStatus(providerData) {
  if (!ioInstance) return;
  ioInstance.emit("provider:status", providerData);
  ioInstance.to("admin:dashboard").emit("provider:status", providerData);
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "provider_status", at: new Date().toISOString() });
}

function broadcastInventoryUpdate(productData) {
  if (!ioInstance) return;
  ioInstance.emit("inventory:updated", productData);
  ioInstance.to("admin:dashboard").emit("inventory:updated", productData);
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "inventory", id: productData?.id, at: new Date().toISOString() });
}

async function broadcastNotification(userId, notification) {
  if (!userId) return null;
  const payload = {
    title: notification?.title || "Needly update",
    body: notification?.body || notification?.message || "You have a new Needly notification.",
    type: notification?.type || "INFO",
  };

  let saved = {
    id: notification?.id || `nt-${Date.now()}`,
    userId,
    ...payload,
    read: false,
    createdAt: new Date().toISOString(),
  };

  try {
    saved = await prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
      },
    });
  } catch (err) {
    // Keep realtime notifications alive even if persistence is temporarily unavailable.
  }

  if (ioInstance) ioInstance.to(`user:${userId}`).emit("notification:created", saved);
  return saved;
}

function broadcastAdminAlert(alert) {
  if (!ioInstance) return;
  ioInstance.to("admin:dashboard").emit("admin:alert", alert);
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "admin_alert", at: new Date().toISOString() });
}

function broadcastContactInquiry(inquiry) {
  if (!ioInstance) return;
  ioInstance.emit("contact:new", inquiry);
  ioInstance.to("admin:dashboard").emit("contact:new", inquiry);
  ioInstance.to("admin:dashboard").emit("admin:alert", {
    type: "contact_inquiry",
    title: "New Contact Message",
    message: `${inquiry.name} sent an inquiry: "${inquiry.subject}"`,
    id: inquiry.id,
  });
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "contact", id: inquiry.id, at: new Date().toISOString() });
}

function broadcastContactUpdate(inquiry) {
  if (!ioInstance) return;
  ioInstance.emit("contact:updated", inquiry);
  ioInstance.to("admin:dashboard").emit("contact:updated", inquiry);
  if (inquiry.userId) {
    ioInstance.to(`user:${inquiry.userId}`).emit("contact:updated", inquiry);
  }
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "contact_update", id: inquiry.id, at: new Date().toISOString() });
}

function broadcastContactSettings(settings) {
  if (!ioInstance) return;
  ioInstance.emit("contact_settings:updated", settings);
  ioInstance.to("admin:dashboard").emit("contact_settings:updated", settings);
  ioInstance.to("admin:dashboard").emit("dashboard:refresh", { reason: "contact_settings", at: new Date().toISOString() });
}

module.exports = {
  setupSockets,
  getIO,
  broadcastOrderUpdate,
  broadcastBookingUpdate,
  broadcastProviderStatus,
  broadcastInventoryUpdate,
  broadcastNotification,
  broadcastAdminAlert,
  broadcastContactInquiry,
  broadcastContactUpdate,
  broadcastContactSettings,
};
