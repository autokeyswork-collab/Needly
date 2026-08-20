const express = require("express");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { initializeTransaction } = require("../lib/paystack");
const { sendPushNotification } = require("../lib/pushNotifications");

const router = express.Router();

/**
 * POST /payments/initialize
 * body: { orderId }
 * Starts a Paystack checkout for an order and returns the URL the
 * customer's app should open (Paystack's hosted payment page, or their
 * React Native SDK can use the returned access_code directly).
 */
router.post("/initialize", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { orderId } = req.body;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, payment: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.customerId !== req.user.id) return res.status(403).json({ error: "Not your order" });

  if (order.payment) {
    if (order.payment.status === "PAID") {
      return res.status(400).json({ error: "This order has already been paid for" });
    }
    // A stale PENDING/FAILED payment (e.g. they closed the checkout
    // without finishing) used to permanently block ever trying again.
    // Clear it so a fresh attempt with a new reference can go out —
    // Paystack references aren't meant to be reused across attempts.
    await prisma.payment.delete({ where: { id: order.payment.id } });
  }

  const reference = `needly_${order.id}_${Date.now()}`;

  const txn = await initializeTransaction({
    email: order.customer.email,
    amountNaira: order.total,
    reference,
    callbackUrl: `${process.env.APP_BASE_URL}/payments/callback`,
    metadata: { orderId: order.id },
  });

  await prisma.payment.create({
    data: { orderId: order.id, reference, amount: order.total, status: "PENDING" },
  });

  res.json({ authorizationUrl: txn.authorization_url, reference });
});

/**
 * POST /payments/webhook
 * Paystack calls this when a transaction completes. This is the source
 * of truth for "did the customer actually pay" — never mark an order paid
 * just because the client says the checkout screen closed successfully.
 *
 * NOTE: this route must receive the *raw* request body to verify the
 * signature, so it's wired up with express.raw() in index.js instead of
 * the global express.json() middleware. See the comment there.
 */
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.body) // raw Buffer
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === "charge.success") {
    const { reference, amount } = event.data;
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { order: { include: { customer: true, vendor: { include: { owner: true, manager: true } } } } },
    });

    if (payment && payment.status !== "PAID") {
      await prisma.payment.update({
        where: { reference },
        data: { status: "PAID", paidAt: new Date() },
      });

      if (payment.order.customer.expoPushToken) {
        sendPushNotification(payment.order.customer.expoPushToken, {
          title: "Payment received",
          body: `Your order #${payment.orderId.slice(-6)} is confirmed and on its way to the vendor.`,
          data: { orderId: payment.orderId },
        });
      }

      // This is the moment the order actually becomes real for the
      // vendor/manager — before this, it was invisible to them entirely
      // (payment-first). Nothing alerted them at all before this fix.
      const contact = payment.order.vendor.owner || payment.order.vendor.manager;
      if (contact?.expoPushToken) {
        sendPushNotification(contact.expoPushToken, {
          title: "New order!",
          body: `${payment.order.customer.name} just paid \u20A6${payment.order.total.toLocaleString()} \u2014 order #${payment.orderId.slice(-6)}`,
          data: { orderId: payment.orderId },
        });
      }

      const io = req.app.get("io");
      if (io) {
        // TrackingScreen listens for "order:updated" specifically (see
        // OrdersContext/TrackingScreen), not "payment:confirmed" — without
        // this, the customer's screen wouldn't auto-refresh even though
        // the webhook fired and the order is genuinely now paid.
        io.to(`order:${payment.orderId}`).emit("payment:confirmed", { orderId: payment.orderId });
        io.to(`order:${payment.orderId}`).emit("order:updated", { orderId: payment.orderId });
        io.to(`vendor:${payment.order.vendorId}`).emit("order:updated", { orderId: payment.orderId });
      }
    }
  }

  // Always 200 quickly — Paystack retries on non-2xx, and slow/failing
  // webhook responses can cause duplicate retries.
  res.sendStatus(200);
});

/**
 * GET /payments/callback — where Paystack's hosted checkout redirects the
 * browser after the customer finishes (success or not). This route does
 * NOT mark anything paid — that's the webhook above, server-to-server,
 * the only source of truth. This is purely a friendly page telling the
 * person to return to the app, since the app itself picks up the real
 * confirmation via socket/push once the webhook fires, not from this redirect.
 */
router.get("/callback", (req, res) => {
  res.set("Content-Type", "text/html").send(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:-apple-system,sans-serif;background:#F5F4F0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;box-sizing:border-box;}
    div{max-width:320px}h1{font-size:20px;color:#14171F}p{color:#6B6F76;font-size:14px}</style></head>
    <body><div><h1>Thanks!</h1><p>You can close this window and return to the Needly app — your order will update automatically once payment is confirmed.</p></div></body></html>
  `);
});

module.exports = router;
