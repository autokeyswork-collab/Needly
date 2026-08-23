const axios = require("axios");
const { getIntegrationValue } = require("./integrationSettings");

function isUsableKey(value) {
  const key = String(value || "").trim();
  return !!key && !/placeholder/i.test(key);
}

async function getFlutterwaveSecretKey() {
  return getIntegrationValue("flutterwave", "FLUTTERWAVE_SECRET_KEY");
}

async function hasFlutterwaveSecretKey() {
  return isUsableKey(await getFlutterwaveSecretKey());
}

async function initializeFlutterwaveTransaction({ email, name, phone, amountNaira, reference, callbackUrl, metadata }) {
  const secretKey = await getFlutterwaveSecretKey();
  if (!isUsableKey(secretKey)) throw new Error("Flutterwave secret key is not configured");

  const { data } = await axios.post(
    "https://api.flutterwave.com/v3/payments",
    {
      tx_ref: reference,
      amount: Math.max(1, Math.round(Number(amountNaira || 0))),
      currency: "NGN",
      redirect_url: callbackUrl,
      customer: {
        email,
        name: name || email,
        phonenumber: phone || undefined,
      },
      customizations: {
        title: "Needly",
        description: metadata?.type === "vendor_onboarding" ? "Vendor onboarding fee" : "Needly order payment",
      },
      meta: metadata,
    },
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const link = data?.data?.link;
  if (!link) throw new Error(data?.message || "Flutterwave did not return a payment link");
  return {
    authorization_url: link,
    access_code: null,
    reference,
    gateway: "flutterwave",
  };
}

async function verifyFlutterwaveTransactionByReference(reference) {
  const secretKey = await getFlutterwaveSecretKey();
  if (!isUsableKey(secretKey)) throw new Error("Flutterwave secret key is not configured");

  const { data } = await axios.get(
    "https://api.flutterwave.com/v3/transactions/verify_by_reference",
    {
      params: { tx_ref: reference },
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (data?.status !== "success" || !data?.data) {
    throw new Error(data?.message || "Flutterwave transaction could not be verified");
  }
  return data.data;
}

module.exports = {
  getFlutterwaveSecretKey,
  hasFlutterwaveSecretKey,
  initializeFlutterwaveTransaction,
  verifyFlutterwaveTransactionByReference,
};
