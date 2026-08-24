const axios = require("axios");
const { getIntegrationValue } = require("./integrationSettings");

async function paystackRequest(method, path, body) {
  const secretKey = await getIntegrationValue("paystack", "PAYSTACK_SECRET_KEY");
  if (!secretKey) throw new Error("Paystack secret key is not configured");
  const { data } = await axios({
    method,
    url: `https://api.paystack.co${path}`,
    data: body,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });
  return data;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

/**
 * Starts a Paystack transaction. `amountNaira` is a whole-Naira integer
 * (matching the rest of this app); Paystack itself bills in kobo, so we
 * multiply by 100 here — nowhere else in the codebase needs to think in kobo.
 */
async function initializeTransaction({ email, amountNaira, reference, callbackUrl, metadata }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    throw new Error("Paystack requires a valid customer email address.");
  }

  const data = await paystackRequest("post", "/transaction/initialize", {
    email: cleanEmail,
    amount: amountNaira * 100,
    reference,
    callback_url: callbackUrl,
    metadata,
  });
  return data.data; // { authorization_url, access_code, reference }
}

async function verifyTransaction(reference) {
  const data = await paystackRequest("get", `/transaction/verify/${reference}`);
  return data.data; // { status: 'success' | 'failed', amount, reference, ... }
}

/**
 * Issues a refund for a previously successful transaction.
 * amountNaira is optional — omit it to refund the full amount.
 */
async function refundTransaction({ reference, amountNaira }) {
  const data = await paystackRequest("post", "/refund", {
    transaction: reference,
    ...(amountNaira ? { amount: amountNaira * 100 } : {}),
  });
  return data.data;
}

async function getPaystackSecretKey() {
  return getIntegrationValue("paystack", "PAYSTACK_SECRET_KEY");
}

module.exports = { getPaystackSecretKey, initializeTransaction, verifyTransaction, refundTransaction };
