require("express-async-errors");
require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");

const prisma = require("./lib/prisma");
const { setupSockets } = require("./sockets/orderSocket");
const authRoutes = require("./routes/auth.routes");
const vendorRoutes = require("./routes/vendors.routes");
const orderRoutes = require("./routes/orders.routes");
const disputeRoutes = require("./routes/disputes.routes");
const paymentRoutes = require("./routes/payments.routes");
const riderRoutes = require("./routes/riders.routes");
const auditRoutes = require("./routes/audit.routes");
const payoutRoutes = require("./routes/payouts.routes");
const operationalIssueRoutes = require("./routes/operationalIssues.routes");
const reviewRoutes = require("./routes/reviews.routes");
const bookingRoutes = require("./routes/bookings.routes");
const notificationRoutes = require("./routes/notifications.routes");
const homeRoutes = require("./routes/home.routes");
const { router: walletRoutes } = require("./routes/wallet.routes");
const { cleanupExpiredPendingOrders } = require("./lib/orderInventory");

const app = express();

// Closes the "CORS is wide open (*)" gap the README flagged as a
// pre-launch requirement. ALLOWED_ORIGINS is a comma-separated list in
// .env (e.g. your Expo dev URL + the deployed app's domain). Falls back
// to no origins (same-origin/native-app requests only, which don't send
// an Origin header) if the env var isn't set, rather than defaulting open.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
const devOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/;
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!isProduction && devOriginPattern.test(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
}));

// The Paystack webhook needs the *raw* request body to verify its
// signature (see payments.routes.js), so it's mounted with express.raw()
// BEFORE the global express.json() middleware below — Express matches
// routes in registration order, so this raw parser only applies here.
app.use("/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, name: "Needly API", health: "/health", databaseHealth: "/health/db" });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/health/db", async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

const adminRoutes = require("./routes/admin.routes");

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/vendors", vendorRoutes);
app.use("/orders", orderRoutes);
app.use("/disputes", disputeRoutes);
app.use("/payments", paymentRoutes);
app.use("/api", paymentRoutes);
app.use("/wallet", walletRoutes);
app.use("/riders", riderRoutes);
app.use("/audit-log", auditRoutes);
app.use("/payouts", payoutRoutes);
app.use("/operational-issues", operationalIssueRoutes);
app.use("/reviews", reviewRoutes);
app.use("/bookings", bookingRoutes);
app.use("/notifications", notificationRoutes);
app.use("/home", homeRoutes);

// Fallback error handler — keeps a stray thrown error from crashing the
// process and returns a consistent JSON shape instead of an HTML stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const httpServer = http.createServer(app);
const io = setupSockets(httpServer);
app.set("io", io); // lets route handlers do req.app.get("io").emit(...)

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Needly backend listening on http://0.0.0.0:${PORT}`);
});

async function runPendingOrderCleanup() {
  try {
    const result = await cleanupExpiredPendingOrders();
    if (result.released) {
      console.log(`Released inventory for ${result.released} expired pending order(s)`);
    }
  } catch (err) {
    console.error("Pending order cleanup failed", err.message);
  }
}

runPendingOrderCleanup();
setInterval(runPendingOrderCleanup, Number(process.env.PENDING_ORDER_CLEANUP_INTERVAL_MS || 15 * 60 * 1000));
