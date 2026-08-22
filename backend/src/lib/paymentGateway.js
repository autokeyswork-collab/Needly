const { getPaystackSecretKey, initializeTransaction: initializePaystackTransaction } = require("./paystack");
const { hasFlutterwaveSecretKey, initializeFlutterwaveTransaction } = require("./flutterwave");

function isUsableKey(value) {
  const key = String(value || "").trim();
  return !!key && !/placeholder/i.test(key);
}

async function hasPaystackSecretKey() {
  return isUsableKey(await getPaystackSecretKey());
}

async function initializeHostedPayment(args) {
  const preferredGateway = String(process.env.PAYMENT_GATEWAY || "flutterwave").trim().toLowerCase();
  const flutterwaveReady = await hasFlutterwaveSecretKey();
  const paystackReady = await hasPaystackSecretKey();

  if (preferredGateway === "paystack" && paystackReady) {
    const txn = await initializePaystackTransaction(args);
    return { ...txn, gateway: "paystack" };
  }

  if (flutterwaveReady) {
    return initializeFlutterwaveTransaction(args);
  }

  if (paystackReady) {
    const txn = await initializePaystackTransaction(args);
    return { ...txn, gateway: "paystack" };
  }

  throw new Error("Payment gateway is not configured. Add Flutterwave or Paystack keys in Super Admin settings.");
}

module.exports = {
  initializeHostedPayment,
};
