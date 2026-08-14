const axios = require("axios");

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Starts a Paystack transaction. `amountNaira` is a whole-Naira integer
 * (matching the rest of this app); Paystack itself bills in kobo, so we
 * multiply by 100 here — nowhere else in the codebase needs to think in kobo.
 */
async function initializeTransaction({ email, amountNaira, reference, callbackUrl, metadata }) {
  const { data } = await paystack.post("/transaction/initialize", {
    email,
    amount: amountNaira * 100,
    reference,
    callback_url: callbackUrl,
    metadata,
  });
  return data.data; // { authorization_url, access_code, reference }
}

async function verifyTransaction(reference) {
  const { data } = await paystack.get(`/transaction/verify/${reference}`);
  return data.data; // { status: 'success' | 'failed', amount, reference, ... }
}

/**
 * Issues a refund for a previously successful transaction.
 * amountNaira is optional — omit it to refund the full amount.
 */
async function refundTransaction({ reference, amountNaira }) {
  const { data } = await paystack.post("/refund", {
    transaction: reference,
    ...(amountNaira ? { amount: amountNaira * 100 } : {}),
  });
  return data.data;
}

module.exports = { initializeTransaction, verifyTransaction, refundTransaction };
