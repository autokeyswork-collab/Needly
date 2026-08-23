const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { initializeFlutterwaveTransaction, verifyFlutterwaveTransactionByReference } = require("../lib/flutterwave");
const { broadcastNotification } = require("../sockets/orderSocket");

const router = express.Router();

const CREDIT_TYPES = new Set(["FUNDING", "ADJUSTMENT", "ORDER_PAYMENT", "RIDER_EARNING", "COMPANY_FEE", "TRANSFER_IN", "WITHDRAWAL_REVERSAL"]);
const DEBIT_TYPES = new Set(["BILL_PAYMENT", "TRANSFER", "TRANSFER_OUT", "REVERSAL", "WITHDRAWAL"]);
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

async function calculatePendingDebits(userId, txClient = prisma) {
  const transactions = await txClient.walletTransaction.findMany({
    where: { userId, status: "PENDING", type: { in: ["WITHDRAWAL", "TRANSFER_OUT"] } },
    select: { amount: true },
  });
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

async function serializeWallet(userId) {
  const [balance, pendingDebitAmount, transactions] = await Promise.all([
    calculateWalletBalance(userId),
    calculatePendingDebits(userId),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  return { balance, pendingDebitAmount, available: Math.max(0, balance - pendingDebitAmount), transactions };
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

async function createWalletCredit({
  userId,
  amount,
  reference,
  type = "ADJUSTMENT",
  category = null,
  description = null,
  gateway = "internal",
  gatewayTransactionId = null,
  providerReference = null,
  metadata = {},
  txClient = prisma,
}) {
  const safeAmount = Math.round(Number(amount || 0));
  if (!userId || !reference || !Number.isFinite(safeAmount) || safeAmount <= 0) return null;

  const existing = await txClient.walletTransaction.findUnique({ where: { reference } });
  if (existing) return existing;

  const balanceBefore = await calculateWalletBalance(userId, txClient);
  return txClient.walletTransaction.create({
    data: {
      userId,
      reference,
      type,
      category,
      amount: safeAmount,
      balanceAfter: balanceBefore + safeAmount,
      status: "SUCCESS",
      gateway,
      gatewayTransactionId,
      providerReference,
      description,
      metadata,
      completedAt: new Date(),
    },
  });
}

async function createWalletDebit({
  userId,
  amount,
  reference,
  type = "TRANSFER_OUT",
  category = null,
  description = null,
  status = "SUCCESS",
  gateway = "wallet",
  metadata = {},
  txClient = prisma,
}) {
  const safeAmount = Math.round(Number(amount || 0));
  if (!userId || !reference || !Number.isFinite(safeAmount) || safeAmount <= 0) {
    const err = new Error("Enter a valid amount");
    err.statusCode = 400;
    throw err;
  }
  const existing = await txClient.walletTransaction.findUnique({ where: { reference } });
  if (existing) return existing;

  const balance = await calculateWalletBalance(userId, txClient);
  const pendingDebits = await calculatePendingDebits(userId, txClient);
  const available = Math.max(0, balance - pendingDebits);
  if (safeAmount > available) {
    const err = new Error(`Insufficient wallet balance. Available balance is ₦${available.toLocaleString()}`);
    err.statusCode = 400;
    throw err;
  }

  return txClient.walletTransaction.create({
    data: {
      userId,
      reference,
      type,
      category,
      amount: safeAmount,
      balanceAfter: status === "SUCCESS" ? balance - safeAmount : balance,
      status,
      gateway,
      description,
      metadata,
      completedAt: status === "SUCCESS" ? new Date() : null,
    },
  });
}

async function findCompanyWalletUser(txClient = prisma) {
  const superAdmin = await txClient.user.findFirst({
    where: { role: "SUPER_ADMIN", approved: true },
    orderBy: { createdAt: "asc" },
  });
  if (superAdmin) return superAdmin;
  return txClient.user.findFirst({
    where: { role: "ADMIN", approved: true },
    orderBy: { createdAt: "asc" },
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

router.get("/", requireAuth, async (req, res) => {
  res.json(await serializeWallet(req.user.id));
});

router.get("/balance", requireAuth, async (req, res) => {
  const balance = await calculateWalletBalance(req.user.id);
  const pendingDebitAmount = await calculatePendingDebits(req.user.id);
  res.json({ balance, pendingDebitAmount, available: Math.max(0, balance - pendingDebitAmount) });
});

router.post("/fund/initialize", requireAuth, async (req, res) => {
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

router.post("/fund/verify", requireAuth, async (req, res) => {
  const reference = String(req.body?.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "reference is required" });

  const tx = await prisma.walletTransaction.findUnique({ where: { reference } });
  if (!tx || tx.userId !== req.user.id) return res.status(404).json({ error: "Wallet transaction not found" });

  const updated = await creditWalletFromFlutterwave(reference, "customer_verify");
  res.json({ transaction: updated, ...(await serializeWallet(req.user.id)) });
});

router.post("/transfer", requireAuth, async (req, res) => {
  const recipient = String(req.body?.recipient || "").trim().toLowerCase();
  const amount = Math.round(Number(req.body?.amount || 0));
  const note = String(req.body?.note || "").trim();
  if (!recipient) return res.status(400).json({ error: "Recipient email or phone number is required" });
  if (!Number.isFinite(amount) || amount < 50) return res.status(400).json({ error: "Enter at least ₦50 to transfer" });

  const recipientUser = await prisma.user.findFirst({
    where: {
      approved: true,
      OR: [
        { email: recipient },
        { phone: recipient },
      ],
    },
  });
  if (!recipientUser) return res.status(404).json({ error: "Recipient wallet was not found" });
  if (recipientUser.id === req.user.id) return res.status(400).json({ error: "You cannot transfer to yourself" });

  try {
    const reference = `needly_transfer_${req.user.id}_${recipientUser.id}_${Date.now()}`;
    const result = await prisma.$transaction(async (tx) => {
      const debit = await createWalletDebit({
        userId: req.user.id,
        amount,
        reference: `${reference}:out`,
        type: "TRANSFER_OUT",
        category: "WALLET_TRANSFER",
        description: `Transfer to ${recipientUser.name}`,
        metadata: { recipientUserId: recipientUser.id, recipient: recipientUser.email, note },
        txClient: tx,
      });
      const credit = await createWalletCredit({
        userId: recipientUser.id,
        amount,
        reference: `${reference}:in`,
        type: "TRANSFER_IN",
        category: "WALLET_TRANSFER",
        description: `Transfer from ${req.user.email || "Needly user"}`,
        metadata: { senderUserId: req.user.id, sender: req.user.email, note },
        txClient: tx,
      });
      return { debit, credit };
    });

    await broadcastNotification(recipientUser.id, {
      title: "Wallet transfer received",
      body: `You received ₦${amount.toLocaleString()} in your Needly wallet.`,
      type: "PAYMENT",
    });

    res.status(201).json({ ...result, ...(await serializeWallet(req.user.id)) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "Wallet transfer failed" });
  }
});

router.post("/withdraw", requireAuth, async (req, res) => {
  const amount = Math.round(Number(req.body?.amount || 0));
  const bankName = String(req.body?.bankName || "").trim();
  const bankAccountNumber = String(req.body?.bankAccountNumber || "").replace(/[^0-9]/g, "");
  const bankAccountName = String(req.body?.bankAccountName || "").trim();

  if (!Number.isFinite(amount) || amount < 500) return res.status(400).json({ error: "Enter at least ₦500 to withdraw" });
  if (!bankName || !bankAccountNumber || !bankAccountName) {
    return res.status(400).json({ error: "Bank name, account number, and account name are required" });
  }

  try {
    const reference = `needly_withdrawal_${req.user.id}_${Date.now()}`;
    const transaction = await prisma.$transaction(async (tx) => createWalletDebit({
      userId: req.user.id,
      amount,
      reference,
      type: "WITHDRAWAL",
      category: "BANK_WITHDRAWAL",
      status: "PENDING",
      description: `Withdrawal to ${bankName} ${bankAccountNumber}`,
      metadata: { bankName, bankAccountNumber, bankAccountName },
      txClient: tx,
    }));

    const companyUser = await findCompanyWalletUser();
    if (companyUser?.id) {
      await broadcastNotification(companyUser.id, {
        title: "Wallet withdrawal requested",
        body: `${req.user.email || "A user"} requested ₦${amount.toLocaleString()} withdrawal.`,
        type: "PAYMENT",
      });
    }

    res.status(201).json({ transaction, ...(await serializeWallet(req.user.id)) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "Withdrawal request failed" });
  }
});

router.patch("/withdrawals/:reference/mark-paid", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const reference = String(req.params.reference || "").trim();
  const existing = await prisma.walletTransaction.findUnique({ where: { reference } });
  if (!existing || existing.type !== "WITHDRAWAL") return res.status(404).json({ error: "Withdrawal request not found" });
  if (existing.status === "SUCCESS") return res.json(existing);
  if (existing.status !== "PENDING") return res.status(400).json({ error: `Cannot mark ${existing.status.toLowerCase()} withdrawal as paid` });

  const updated = await prisma.$transaction(async (tx) => {
    const balanceBefore = await calculateWalletBalance(existing.userId, tx);
    return tx.walletTransaction.update({
      where: { reference },
      data: {
        status: "SUCCESS",
        balanceAfter: balanceBefore - existing.amount,
        completedAt: new Date(),
        metadata: { ...(existing.metadata || {}), adminNote: req.body?.note || null, markedPaidById: req.user.id },
      },
    });
  });
  await broadcastNotification(existing.userId, {
    title: "Withdrawal paid",
    body: `Your ₦${existing.amount.toLocaleString()} wallet withdrawal has been marked paid.`,
    type: "PAYMENT",
  });
  res.json(updated);
});

router.patch("/withdrawals/:reference/reject", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const reference = String(req.params.reference || "").trim();
  const existing = await prisma.walletTransaction.findUnique({ where: { reference } });
  if (!existing || existing.type !== "WITHDRAWAL") return res.status(404).json({ error: "Withdrawal request not found" });
  if (existing.status !== "PENDING") return res.status(400).json({ error: `Cannot reject ${existing.status.toLowerCase()} withdrawal` });

  const updated = await prisma.walletTransaction.update({
    where: { reference },
    data: {
      status: "FAILED",
      metadata: { ...(existing.metadata || {}), adminNote: req.body?.note || null, rejectedById: req.user.id },
    },
  });
  await broadcastNotification(existing.userId, {
    title: "Withdrawal rejected",
    body: req.body?.note || "Your wallet withdrawal request was not approved.",
    type: "PAYMENT",
  });
  res.json(updated);
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
  calculatePendingDebits,
  createWalletCredit,
  createWalletDebit,
  creditWalletFromFlutterwave,
  findCompanyWalletUser,
  handleFlutterwaveWalletWebhook,
  markWalletFundingFailed,
  reverseWalletFunding,
};
