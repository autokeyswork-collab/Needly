const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { initializeFlutterwaveTransaction, verifyFlutterwaveTransactionByReference } = require("../lib/flutterwave");
const { broadcastNotification } = require("../sockets/orderSocket");

const router = express.Router();

const CREDIT_TYPES = new Set(["FUNDING", "ADJUSTMENT"]);
const DEBIT_TYPES = new Set(["BILL_PAYMENT", "TRANSFER", "REVERSAL"]);
const BILL_CATEGORIES = new Set(["AIRTIME", "DATA", "ELECTRICITY", "TV", "INTERNET", "WATER", "GAS"]);

function appUrl(path) {
  const base = process.env.APP_BASE_URL || "http://localhost:4000";
  return `${base.replace(/\/$/, "")}${path}`;
}

function signedAmount(tx) {
  if (tx.status !== "SUCCESS") return 0;
  if (CREDIT_TYPES.has(tx.type)) return tx.amount;
  if (DEBIT_TYPES.has(tx.type)) return -tx.amount;
  return 0;
}

async function calculateWalletBalance(userId, txClient = prisma) {
  const transactions = await txClient.walletTransaction.findMany({
    where: { userId },
    select: { amount: true, type: true, status: true },
  });
  return transactions.reduce((sum, tx) => sum + signedAmount(tx), 0);
}

async function serializeWallet(userId) {
  const [balance, transactions] = await Promise.all([
    calculateWalletBalance(userId),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  return { balance, transactions };
}

function isSuccessfulFlutterwave(data) {
  const status = String(data?.status || "").toLowerCase();
  return status === "successful" || status === "success";
}

async function creditWalletFromFlutterwave(reference, source = "verify") {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.walletTransaction.findUnique({ where: { reference } });
    if (!existing) return null;
    if (existing.type !== "FUNDING") return existing;
    if (existing.status === "SUCCESS") return existing;

    const fw = await verifyFlutterwaveTransactionByReference(reference);
    const paidAmount = Math.round(Number(fw.amount || 0));
    const expectedAmount = Math.round(Number(existing.amount || 0));
    const currency = String(fw.currency || "").toUpperCase();

    if (!isSuccessfulFlutterwave(fw) || currency !== "NGN" || paidAmount !== expectedAmount) {
      return tx.walletTransaction.update({
        where: { reference },
        data: {
          status: "FAILED",
          gatewayTransactionId: fw.id ? String(fw.id) : existing.gatewayTransactionId,
          providerReference: fw.flw_ref || fw.processor_response || existing.providerReference,
          metadata: { ...(existing.metadata || {}), source, verifyStatus: fw.status, verifiedAt: new Date().toISOString() },
        },
      });
    }

    const balanceBefore = await calculateWalletBalance(existing.userId, tx);
    const balanceAfter = balanceBefore + existing.amount;
    const updated = await tx.walletTransaction.update({
      where: { reference },
      data: {
        status: "SUCCESS",
        balanceAfter,
        gatewayTransactionId: fw.id ? String(fw.id) : null,
        providerReference: fw.flw_ref || null,
        metadata: { ...(existing.metadata || {}), source, flutterwave: fw },
        completedAt: new Date(),
      },
    });
    return updated;
  });
}

async function markWalletFundingFailed(reference, metadata = {}) {
  const tx = await prisma.walletTransaction.findUnique({ where: { reference } });
  if (!tx || tx.status === "SUCCESS" || tx.status === "REVERSED") return tx;
  return prisma.walletTransaction.update({
    where: { reference },
    data: { status: "FAILED", metadata: { ...(tx.metadata || {}), ...metadata } },
  });
}

async function reverseWalletFunding(reference, metadata = {}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.walletTransaction.findUnique({ where: { reference } });
    if (!existing || existing.type !== "FUNDING") return existing;
    if (existing.status === "REVERSED") return existing;

    const balanceBefore = await calculateWalletBalance(existing.userId, tx);
    const balanceAfter = existing.status === "SUCCESS" ? Math.max(0, balanceBefore - existing.amount) : balanceBefore;
    return tx.walletTransaction.update({
      where: { reference },
      data: {
        status: "REVERSED",
        balanceAfter,
        metadata: { ...(existing.metadata || {}), ...metadata, reversedAt: new Date().toISOString() },
      },
    });
  });
}

router.get("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  res.json(await serializeWallet(req.user.id));
});

router.get("/balance", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  res.json({ balance: await calculateWalletBalance(req.user.id) });
});

router.post("/fund/initialize", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const amount = Math.round(Number(req.body?.amount || 0));
  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ error: "Enter at least ₦100 to fund your wallet" });
  }
  if (amount > 1000000) {
    return res.status(400).json({ error: "Wallet funding is limited to ₦1,000,000 per transaction" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const reference = `needly_wallet_${req.user.id}_${Date.now()}`;

  const walletTx = await prisma.walletTransaction.create({
    data: {
      userId: req.user.id,
      reference,
      type: "FUNDING",
      amount,
      status: "PENDING",
      gateway: "flutterwave",
      description: "Wallet funding via Flutterwave",
    },
  });

  try {
    const checkout = await initializeFlutterwaveTransaction({
      email: user.email,
      name: user.name,
      phone: user.phone,
      amountNaira: amount,
      reference,
      callbackUrl: appUrl(`/wallet/callback?reference=${encodeURIComponent(reference)}`),
      metadata: { type: "wallet_funding", userId: user.id, walletTransactionId: walletTx.id },
    });
    res.status(201).json({ reference, amount, authorizationUrl: checkout.authorization_url, gateway: "flutterwave" });
  } catch (err) {
    await markWalletFundingFailed(reference, { initializationError: err.message });
    res.status(502).json({ error: err.response?.data?.message || err.message || "Wallet funding checkout could not be created" });
  }
});

router.post("/fund/verify", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const reference = String(req.body?.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "reference is required" });

  const tx = await prisma.walletTransaction.findUnique({ where: { reference } });
  if (!tx || tx.userId !== req.user.id) return res.status(404).json({ error: "Wallet transaction not found" });

  const updated = await creditWalletFromFlutterwave(reference, "customer_verify");
  res.json({ transaction: updated, ...(await serializeWallet(req.user.id)) });
});

router.post("/bills/pay", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const category = String(req.body?.category || "").trim().toUpperCase();
  const amount = Math.round(Number(req.body?.amount || 0));
  const recipient = String(req.body?.recipient || "").trim();

  if (!BILL_CATEGORIES.has(category)) return res.status(400).json({ error: "Unsupported bill category" });
  if (!Number.isFinite(amount) || amount < 50) return res.status(400).json({ error: "Enter a valid bill amount" });
  if (!recipient) return res.status(400).json({ error: "Recipient, meter number, or phone number is required" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const balance = await calculateWalletBalance(req.user.id, tx);
      if (amount > balance) {
        const err = new Error(`Insufficient wallet balance. Available balance is ₦${balance.toLocaleString()}`);
        err.statusCode = 400;
        throw err;
      }
      const reference = `needly_bill_${req.user.id}_${Date.now()}`;
      const nextBalance = balance - amount;
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: req.user.id,
          reference,
          type: "BILL_PAYMENT",
          category,
          amount,
          balanceAfter: nextBalance,
          status: "SUCCESS",
          gateway: "wallet",
          description: `${category.replace(/_/g, " ")} payment to ${recipient}`,
          metadata: { recipient, provider: req.body?.provider || null, note: req.body?.note || null },
          completedAt: new Date(),
        },
      });
      return { balance: nextBalance, transaction };
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "Bill payment failed" });
  }
});

router.get("/callback", async (req, res) => {
  const reference = String(req.query.reference || req.query.tx_ref || "").trim();
  if (reference) {
    creditWalletFromFlutterwave(reference, "callback").catch((err) => console.error("Wallet callback verification failed", err.message));
  }
  res.set("Content-Type", "text/html").send(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#F8F5FF;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px;box-sizing:border-box}div{max-width:340px;background:#fff;border-radius:24px;padding:24px;box-shadow:0 18px 50px rgba(100,43,228,.16)}h1{font-size:22px;color:#11123A}p{color:#6B6F76;font-size:14px;line-height:1.5}</style></head>
    <body><div><h1>Wallet payment received</h1><p>You can close this page and return to Needly Pay. Your wallet will refresh after Flutterwave confirms the transaction.</p></div></body></html>
  `);
});

async function handleFlutterwaveWalletWebhook(payload = {}) {
  const data = payload.data || {};
  const reference = data.tx_ref || data.reference || payload.tx_ref || payload.reference;
  if (!reference || !String(reference).startsWith("needly_wallet_")) return false;

  const status = String(data.status || payload.status || "").toLowerCase();
  const event = String(payload.event || "").toLowerCase();

  if (status === "successful" || status === "success" || event === "charge.completed") {
    const updated = await creditWalletFromFlutterwave(reference, "webhook");
    if (updated?.userId) {
      await broadcastNotification(updated.userId, {
        title: "Wallet funded",
        body: `Your Needly wallet has been credited with ₦${updated.amount.toLocaleString()}.`,
        type: "PAYMENT",
      });
    }
    return true;
  }

  if (status === "failed" || event.includes("failed")) {
    await markWalletFundingFailed(reference, { webhookStatus: status, event });
    return true;
  }

  if (status === "reversed" || event.includes("reversal") || event.includes("refund")) {
    await reverseWalletFunding(reference, { webhookStatus: status, event });
    return true;
  }

  return true;
}

module.exports = {
  router,
  calculateWalletBalance,
  creditWalletFromFlutterwave,
  handleFlutterwaveWalletWebhook,
  markWalletFundingFailed,
  reverseWalletFunding,
};
