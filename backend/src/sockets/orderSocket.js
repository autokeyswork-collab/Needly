const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

/**
 * Sets up Socket.io on top of the existing HTTP server. Clients connect
 * with their JWT (same one used for REST calls) and get placed into rooms:
 *   - `order:<id>`   — anyone actively viewing that order's tracking screen
 *   - `riders:online` — every connected rider, used for dispatch broadcast
 *   - `vendor:<id>`   — the owner/manager of that store, used to alert
 *     them the instant a new order's payment confirms (see the Paystack
 *     webhook in payments.routes.js)
 *
 * Route handlers emit into these rooms (see orders.routes.js) so every
 * connected client sees status changes instantly, without polling.
 */
function setupSockets(httpServer) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins.length ? allowedOrigins : false },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", async (socket) => {
    if (socket.user.role === "RIDER") {
      socket.join("riders:online");
    }
    if (socket.user.role === "VENDOR" || socket.user.role === "MANAGER") {
      const vendor = socket.user.role === "VENDOR"
        ? await prisma.vendor.findUnique({ where: { ownerId: socket.user.id } })
        : await prisma.vendor.findUnique({ where: { managerId: socket.user.id } });
      if (vendor) socket.join(`vendor:${vendor.id}`);
    }

    // Client asks to watch a specific order's tracking screen.
    socket.on("order:watch", (orderId) => {
      socket.join(`order:${orderId}`);
    });
    socket.on("order:unwatch", (orderId) => {
      socket.leave(`order:${orderId}`);
    });
  });

  return io;
}

module.exports = { setupSockets };
