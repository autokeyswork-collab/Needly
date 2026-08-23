const axios = require("axios");
const { getIntegrationValue } = require("./integrationSettings");

const OAUTH_TOKEN_URL = "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";
let cachedOAuthToken = null;
let cachedOAuthTokenExpiresAt = 0;

function isUsableKey(value) {
  const key = String(value || "").trim();
  return !!key && !/placeholder/i.test(key);
}

async function getFlutterwaveSecretKey() {
  return (await getIntegrationValue("flutterwave", "FLUTTERWAVE_SECRET_KEY"))
    || process.env.FLW_SECRET_KEY
    || "";
}

async function getFlutterwaveClientId() {
  return (await getIntegrationValue("flutterwave", "FLUTTERWAVE_CLIENT_ID"))
    || process.env.FLW_CLIENT_ID
    || "";
}

async function getFlutterwaveClientSecret() {
  return (await getIntegrationValue("flutterwave", "FLUTTERWAVE_CLIENT_SECRET"))
    || process.env.FLW_CLIENT_SECRET
    || "";
}

async function getFlutterwaveOAuthToken() {
  if (cachedOAuthToken && cachedOAuthTokenExpiresAt > Date.now() + 60000) {
    return cachedOAuthToken;
  }

  const clientId = await getFlutterwaveClientId();
  const clientSecret = await getFlutterwaveClientSecret();
  if (!isUsableKey(clientId) || !isUsableKey(clientSecret)) {
    throw new Error("Flutterwave Client ID and Client Secret are not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const { data } = await axios.post(OAUTH_TOKEN_URL, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Flutterwave OAuth token could not be created");
  }

  const expiresInMs = Math.max(60, Number(data.expires_in || 600)) * 1000;
  cachedOAuthToken = data.access_token;
  cachedOAuthTokenExpiresAt = Date.now() + expiresInMs;
  return cachedOAuthToken;
}

async function getFlutterwaveAuthorizationHeader() {
  const secretKey = await getFlutterwaveSecretKey();
  if (isUsableKey(secretKey)) return `Bearer ${secretKey}`;
  const token = await getFlutterwaveOAuthToken();
  return `Bearer ${token}`;
}

async function hasFlutterwaveSecretKey() {
  if (isUsableKey(await getFlutterwaveSecretKey())) return true;
  return isUsableKey(await getFlutterwaveClientId()) && isUsableKey(await getFlutterwaveClientSecret());
}

async function initializeFlutterwaveTransaction({ email, name, phone, amountNaira, reference, callbackUrl, metadata }) {
  const authorization = await getFlutterwaveAuthorizationHeader();

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
        Authorization: authorization,
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
  const authorization = await getFlutterwaveAuthorizationHeader();

  const { data } = await axios.get(
    "https://api.flutterwave.com/v3/transactions/verify_by_reference",
    {
      params: { tx_ref: reference },
      headers: {
        Authorization: authorization,
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
  getFlutterwaveAuthorizationHeader,
  getFlutterwaveClientId,
  getFlutterwaveClientSecret,
  getFlutterwaveOAuthToken,
  getFlutterwaveSecretKey,
  hasFlutterwaveSecretKey,
  initializeFlutterwaveTransaction,
  verifyFlutterwaveTransactionByReference,
};
