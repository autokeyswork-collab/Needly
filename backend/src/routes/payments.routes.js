const express = require("express");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getPaystackSecretKey } = require("../lib/paystack");
const { getAvailablePaymentGateways, initializeHostedPayment } = require("../lib/paymentGateway");
const { getIntegrationValue } = require("../lib/integrationSettings");
const { sendPushNotification } = require("../lib/pushNotifications");
const { broadcastAdminAlert, broadcastNotification } = require("../sockets/orderSocket");

const router = express.Router();
const DEFAULT_PLATFORM_FEE_PERCENT = 2.5;
const DEFAULT_RIDER_FEE_PERCENT = 5;
const DEFAULT_DELIVERY_BASE_FEE = Number(process.env.DELIVERY_BASE_FEE_NAIRA || 500);
const DEFAULT_DELIVERY_PER_KM = Number(process.env.DELIVERY_PER_KM_NAIRA || 120);
const DEFAULT_DELIVERY_MIN_FEE = Number(process.env.DELIVERY_MIN_FEE_NAIRA || 500);
const DEFAULT_DELIVERY_MAX_FEE = Number(process.env.DELIVERY_MAX_FEE_NAIRA || 3500);

async function getPlatformFeePercent() {
  try {
    const rule = await prisma.commissionRule.findFirst({
      where: { active: true, targetType: "GLOBAL" },
      orderBy: { createdAt: "desc" },
    });
    const value = Number(rule?.ratePercent);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_PLATFORM_FEE_PERCENT;
  } catch (_) {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }
}

function toRad(value) {
  return (Number(value) * Math.PI) / 180;
}

function distanceKm(fromLat, fromLng, toLat, toLng) {
  const coords = [fromLat, fromLng, toLat, toLng].map(Number);
  if (coords.some((value) => !Number.isFinite(value))) return null;
  const [lat1, lng1, lat2, lng2] = coords;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateDeliveryFee(order) {
  const km = distanceKm(order.vendor?.latitude, order.vendor?.longitude, order.deliveryLatitude, order.deliveryLongitude);
  if (!km) {
    return {
      deliveryFeeAmount: DEFAULT_DELIVERY_MIN_FEE,
      deliveryDistanceKm: null,
    };
  }

  const rawFee = DEFAULT_DELIVERY_BASE_FEE + Math.ceil(km * DEFAULT_DELIVERY_PER_KM);
  const cappedFee = Math.min(DEFAULT_DELIVERY_MAX_FEE, Math.max(DEFAULT_DELIVERY_MIN_FEE, rawFee));
  return {
    deliveryFeeAmount: cappedFee,
    deliveryDistanceKm: Number(km.toFixed(2)),
  };
}

function calculatePaymentSplit(vendorAmount, platformFeePercent, deliveryFeeAmount = 0, deliveryDistanceKm = null) {
  const safeVendorAmount = Math.max(0, Math.round(Number(vendorAmount || 0)));
  const safePercent = Math.max(0, Number(platformFeePercent || 0));
  const safeDeliveryFee = Math.max(0, Math.round(Number(deliveryFeeAmount || 0)));
  const platformFeeAmount = Math.round(safeVendorAmount * (safePercent / 100));
  const companyDeliveryFeeAmount = Math.round(safeDeliveryFee * (DEFAULT_RIDER_FEE_PERCENT / 100));
  const riderPayoutAmount = Math.max(0, safeDeliveryFee - companyDeliveryFeeAmount);
  return {
    vendorAmount: safeVendorAmount,
    platformFeePercent: safePercent,
    platformFeeAmount,
    deliveryFeeAmount: safeDeliveryFee,
    deliveryDistanceKm,
    riderFeePercent: DEFAULT_RIDER_FEE_PERCENT,
    riderPayoutAmount,
    companyDeliveryFeeAmount,
    companyAmount: platformFeeAmount + companyDeliveryFeeAmount,
    customerAmount: safeVendorAmount + platformFeeAmount + safeDeliveryFee,
  };
}

async function markVendorOnboardingPaid(reference) {
  const vendor = await prisma.vendor.findUnique({
    where: { onboardingPaymentReference: reference },
    include: { owner: true },
  });

  if (!vendor || vendor.onboardingFeeStatus === "PAID") return vendor;

  const updatedVendor = await prisma.vendor.update({
    where: { id: vendor.id },
    data: { onboardingFeeStatus: "PAID", onboardingPaidAt: new Date() },
    include: { owner: true },
  });

  if (updatedVendor.ownerId) {
    await broadcastNotification(updatedVendor.ownerId, {
      title: "Onboarding payment received",
      body: `Your ₦${Number(updatedVendor.onboardingFeeAmount || 2500).toLocaleString()} vendor onboarding fee was received. Admin review is next.`,
      type: "PAYMENT",
    });
  }

  broadcastAdminAlert({
    type: "vendor_onboarding_paid",
    title: "Vendor onboarding fee paid",
    message: `${updatedVendor.name} paid ₦${Number(updatedVendor.onboardingFeeAmount || 2500).toLocaleString()} onboarding fee.`,
    vendorId: updatedVendor.id,
  });

  return updatedVendor;
}

async function markOrderPaymentPaid(reference, req) {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { order: { include: { customer: true, vendor: { include: { owner: true, manager: true } } } } },
  });

  if (!payment || payment.status === "PAID") return payment;

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

  const contact = payment.order.vendor.owner || payment.order.vendor.manager;
  if (contact?.expoPushToken) {
    sendPushNotification(contact.expoPushToken, {
      title: "New order!",
      body: `${payment.order.customer.name} just paid \u20A6${payment.amount.toLocaleString()} \u2014 order #${payment.orderId.slice(-6)}`,
      data: { orderId: payment.orderId },
    });
  }

  if (contact?.id) {
    await broadcastNotification(contact.id, {
      title: "New paid order",
      body: `${payment.order.customer.name} paid \u20A6${payment.amount.toLocaleString()}. Confirm receipt when the money enters your account.`,
      type: "PAYMENT",
    });
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`order:${payment.orderId}`).emit("payment:confirmed", { orderId: payment.orderId });
    io.to(`order:${payment.orderId}`).emit("order:updated", { orderId: payment.orderId });
    io.to(`vendor:${payment.order.vendorId}`).emit("order:updated", { orderId: payment.orderId });
  }

  return payment;
}

router.get("/platform-fee", requireAuth, async (_req, res) => {
  const platformFeePercent = await getPlatformFeePercent();
  res.json({
    platformFeePercent,
    riderFeePercent: DEFAULT_RIDER_FEE_PERCENT,
    deliveryBaseFee: DEFAULT_DELIVERY_BASE_FEE,
    deliveryPerKm: DEFAULT_DELIVERY_PER_KM,
    deliveryMinFee: DEFAULT_DELIVERY_MIN_FEE,
    deliveryMaxFee: DEFAULT_DELIVERY_MAX_FEE,
  });
});

router.get("/options", requireAuth, async (_req, res) => {
  const gateways = await getAvailablePaymentGateways();
  res.json({ gateways, defaultGateway: gateways.find((gateway) => gateway.enabled)?.id || null });
});

/**
 * POST /payments/initialize
 * body: { orderId }
 * Starts a Paystack checkout for an order and returns the URL the
 * customer's app should open (Paystack's hosted payment page, or their
 * React Native SDK can use the returned access_code directly).
 */
router.post("/initialize", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { orderId, gateway } = req.body;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, vendor: true, payment: true },
  });
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

  const platformFeePercent = await getPlatformFeePercent();
  const delivery = calculateDeliveryFee(order);
  const split = calculatePaymentSplit(order.total, platformFeePercent, delivery.deliveryFeeAmount, delivery.deliveryDistanceKm);
  const reference = `needly_${order.id}_${Date.now()}`;

  let txn;
  try {
    txn = await initializeHostedPayment({
      email: order.customer.email,
      name: order.customer.name,
      phone: order.customer.phone,
      amountNaira: split.customerAmount,
      reference,
      gateway,
      callbackUrl: `${process.env.APP_BASE_URL}/payments/callback`,
      metadata: {
        type: "order_payment",
        orderId: order.id,
        vendorId: order.vendorId,
        vendorAmount: split.vendorAmount,
        platformFeeAmount: split.platformFeeAmount,
        platformFeePercent: split.platformFeePercent,
        deliveryFeeAmount: split.deliveryFeeAmount,
        deliveryDistanceKm: split.deliveryDistanceKm,
        riderFeePercent: split.riderFeePercent,
        riderPayoutAmount: split.riderPayoutAmount,
        companyDeliveryFeeAmount: split.companyDeliveryFeeAmount,
        companyAmount: split.companyAmount,
      },
    });
  } catch (err) {
    console.error("Payment checkout initialization failed", err.response?.data || err.message);
    return res.status(502).json({
      error: err.response?.data?.message || err.message || "Payment checkout could not be created. Please try again.",
    });
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      reference,
      amount: split.customerAmount,
      vendorAmount: split.vendorAmount,
      platformFeeAmount: split.platformFeeAmount,
      platformFeePercent: split.platformFeePercent,
      deliveryFeeAmount: split.deliveryFeeAmount,
      deliveryDistanceKm: split.deliveryDistanceKm,
      riderPayoutAmount: split.riderPayoutAmount,
      companyDeliveryFeeAmount: split.companyDeliveryFeeAmount,
      gateway: txn.gateway || gateway || "paystack",
      status: "PENDING",
    },
  });

  res.json({ authorizationUrl: txn.authorization_url, gateway: txn.gateway || "paystack", reference, ...split });
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
  const paystackSecretKey = await getPaystackSecretKey();
  if (!paystackSecretKey) return res.status(500).json({ error: "Paystack secret key is not configured" });
  const expectedSignature = crypto
    .createHmac("sha512", paystackSecretKey)
    .update(req.body) // raw Buffer
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === "charge.success") {
    const { reference } = event.data;
    if (String(reference || "").startsWith("needly_vendor_onboarding_")) {
      await markVendorOnboardingPaid(reference);
      return res.sendStatus(200);
    }

    await markOrderPaymentPaid(reference, req);
  }

  // Always 200 quickly — Paystack retries on non-2xx, and slow/failing
  // webhook responses can cause duplicate retries.
  res.sendStatus(200);
});

async function handleFlutterwaveWebhook(req, res) {
  const secretHash = await getIntegrationValue("flutterwave", "FLUTTERWAVE_WEBHOOK_SECRET_HASH");
  if (!secretHash) return res.status(500).json({ error: "Flutterwave webhook secret hash is not configured" });
  if (req.headers["verif-hash"] !== secretHash) {
    return res.status(401).json({ error: "Invalid Flutterwave webhook hash" });
  }

  const payload = req.body || {};
  const data = payload.data || {};
  const reference = data.tx_ref || data.reference || payload.tx_ref || payload.reference;
  const status = String(data.status || payload.status || "").toLowerCase();
  const successful = status === "successful" || status === "success" || payload.event === "charge.completed";

  if (successful && reference) {
    if (String(reference).startsWith("needly_vendor_onboarding_")) {
      await markVendorOnboardingPaid(reference);
    } else {
      await markOrderPaymentPaid(reference, req);
    }
  }

  res.sendStatus(200);
}

router.post("/flutterwave/webhook", handleFlutterwaveWebhook);
router.post("/webhook/flutterwave", handleFlutterwaveWebhook);

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

router.get("/vendor-onboarding/callback", (req, res) => {
  res.set("Content-Type", "text/html").send(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:-apple-system,sans-serif;background:#F8F5FF;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;box-sizing:border-box;}
    div{max-width:340px;background:#fff;border-radius:22px;padding:24px;box-shadow:0 18px 50px rgba(100,43,228,.16)}h1{font-size:22px;color:#11123A}p{color:#6B6F76;font-size:14px;line-height:1.5}</style></head>
    <body><div><h1>Onboarding payment received</h1><p>You can close this page and return to Needly. Admin will review and activate your vendor account after confirming your registration.</p></div></body></html>
  `);
});

router.patch("/:orderId/vendor-received", requireAuth, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { payment: true, customer: true, vendor: true, items: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const isVendor = req.user.role === "VENDOR" && order.vendor.ownerId === req.user.id;
  const isManager = req.user.role === "MANAGER" && order.vendor.managerId === req.user.id;
  const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  if (!isVendor && !isManager && !isAdmin) {
    return res.status(403).json({ error: "Only this vendor or Admin can confirm money received" });
  }
  if (!order.payment || order.payment.status !== "PAID") {
    return res.status(400).json({ error: "The customer payment is not marked paid yet" });
  }
  if (order.payment.vendorReceived) {
    return res.json({ ...order, payment: order.payment });
  }

  const payment = await prisma.payment.update({
    where: { orderId: order.id },
    data: {
      vendorReceived: true,
      vendorReceivedAt: new Date(),
      vendorReceivedById: req.user.id,
    },
  });
  const updated = { ...order, payment };

  await broadcastNotification(order.customerId, {
    title: "Vendor confirmed payment",
    body: `${order.vendor.name} confirmed receiving money for order #${order.id.slice(-6)}.`,
    type: "PAYMENT",
  });

  if (order.customer.expoPushToken) {
    sendPushNotification(order.customer.expoPushToken, {
      title: "Vendor confirmed payment",
      body: `${order.vendor.name} confirmed your payment.`,
      data: { orderId: order.id, type: "vendor-payment-received" },
    });
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`order:${order.id}`).emit("order:updated", updated);
    io.to(`user:${order.customerId}`).emit("order:updated", updated);
    io.to(`vendor:${order.vendorId}`).emit("order:updated", updated);
    io.to("admin:dashboard").emit("dashboard:refresh", { reason: "payment_received", id: order.id, at: new Date().toISOString() });
  }

  res.json(updated);
});

module.exports = router;
