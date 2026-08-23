const { getPaystackSecretKey, initializeTransaction: initializePaystackTransaction } = require("./paystack");
const { hasFlutterwaveSecretKey, initializeFlutterwaveTransaction } = require("./flutterwave");

function isUsableKey(value) {
  const key = String(value || "").trim();
  return !!key && !/placeholder/i.test(key);
}

async function hasPaystackSecretKey() {
  return isUsableKey(await getPaystackSecretKey());
}

async function getAvailablePaymentGateways() {
  const [flutterwaveReady, paystackReady] = await Promise.all([
    hasFlutterwaveSecretKey(),
    hasPaystackSecretKey(),
  ]);
  return [
    {
      id: "flutterwave",
      label: "Flutterwave",
      enabled: flutterwaveReady,
      description: "Cards, bank transfer and mobile money where available.",
    },
    {
      id: "paystack",
      label: "Paystack",
      enabled: paystackReady,
      description: "Cards, bank transfer and USSD through Paystack.",
    },
  ];
}

async function initializeHostedPayment(args) {
  const requestedGateway = String(args.gateway || "").trim().toLowerCase();
  const preferredGateway = String(process.env.PAYMENT_GATEWAY || "flutterwave").trim().toLowerCase();
  const flutterwaveReady = await hasFlutterwaveSecretKey();
  const paystackReady = await hasPaystackSecretKey();

  if (requestedGateway) {
    if (requestedGateway === "paystack" && paystackReady) {
      const txn = await initializePaystackTransaction(args);
      return { ...txn, gateway: "paystack" };
    }
    if (requestedGateway === "flutterwave" && flutterwaveReady) {
      return initializeFlutterwaveTransaction(args);
    }
    throw new Error(`${requestedGateway === "paystack" ? "Paystack" : requestedGateway === "flutterwave" ? "Flutterwave" : "Selected payment option"} is not configured`);
  }

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
  getAvailablePaymentGateways,
  initializeHostedPayment,
};
