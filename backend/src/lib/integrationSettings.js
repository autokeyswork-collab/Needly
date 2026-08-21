const prisma = require("./prisma");

const INTEGRATION_CATALOG = [
  {
    provider: "brevo",
    label: "Brevo Email",
    description: "SMTP settings used for registration, approval and notification emails.",
    settings: [
      { key: "SMTP_HOST", label: "SMTP Host", envKey: "SMTP_HOST", secret: false, placeholder: "smtp-relay.brevo.com" },
      { key: "SMTP_PORT", label: "SMTP Port", envKey: "SMTP_PORT", secret: false, placeholder: "587" },
      { key: "SMTP_SECURE", label: "Use Secure SMTP", envKey: "SMTP_SECURE", secret: false, placeholder: "false" },
      { key: "SMTP_USER", label: "SMTP Login", envKey: "SMTP_USER", secret: true, placeholder: "login@smtp-brevo.com" },
      { key: "SMTP_PASS", label: "SMTP Key", envKey: "SMTP_PASS", secret: true, placeholder: "Paste Brevo SMTP key" },
      { key: "MAIL_FROM", label: "From Email", envKey: "MAIL_FROM", secret: false, placeholder: "Needly <hello@example.com>" },
    ],
  },
  {
    provider: "paystack",
    label: "Paystack",
    description: "Payment checkout, verification, webhook and refund keys.",
    settings: [
      { key: "PAYSTACK_PUBLIC_KEY", label: "Public Key", envKey: "PAYSTACK_PUBLIC_KEY", secret: true, placeholder: "pk_live_..." },
      { key: "PAYSTACK_SECRET_KEY", label: "Secret Key", envKey: "PAYSTACK_SECRET_KEY", secret: true, placeholder: "sk_live_..." },
    ],
  },
  {
    provider: "flutterwave",
    label: "Flutterwave",
    description: "Reserved for Flutterwave payment and payout integration.",
    settings: [
      { key: "FLUTTERWAVE_PUBLIC_KEY", label: "Public Key", envKey: "FLUTTERWAVE_PUBLIC_KEY", secret: true, placeholder: "FLWPUBK_..." },
      { key: "FLUTTERWAVE_SECRET_KEY", label: "Secret Key", envKey: "FLUTTERWAVE_SECRET_KEY", secret: true, placeholder: "FLWSECK_..." },
      { key: "FLUTTERWAVE_ENCRYPTION_KEY", label: "Encryption Key", envKey: "FLUTTERWAVE_ENCRYPTION_KEY", secret: true, placeholder: "Encryption key" },
    ],
  },
  {
    provider: "social",
    label: "Social Login",
    description: "OAuth/client IDs for Google, Apple and Facebook sign-in.",
    settings: [
      { key: "GOOGLE_CLIENT_ID", label: "Google Client ID", envKey: "GOOGLE_CLIENT_ID", secret: false, placeholder: "Google OAuth client ID" },
      { key: "APPLE_CLIENT_ID", label: "Apple Client ID", envKey: "APPLE_CLIENT_ID", secret: false, placeholder: "Apple Services ID" },
      { key: "FACEBOOK_APP_ID", label: "Facebook App ID", envKey: "FACEBOOK_APP_ID", secret: false, placeholder: "Facebook app ID" },
      { key: "FACEBOOK_APP_SECRET", label: "Facebook App Secret", envKey: "FACEBOOK_APP_SECRET", secret: true, placeholder: "Facebook app secret" },
    ],
  },
  {
    provider: "maps",
    label: "Maps & Location",
    description: "Location/search APIs for address lookup and delivery routing.",
    settings: [
      { key: "GOOGLE_MAPS_API_KEY", label: "Google Maps API Key", envKey: "GOOGLE_MAPS_API_KEY", secret: true, placeholder: "Google Maps key" },
    ],
  },
];

function maskValue(value) {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

async function getIntegrationRecord(provider, key) {
  try {
    return await prisma.integrationSetting.findUnique({
      where: { provider_key: { provider, key } },
    });
  } catch (err) {
    return null;
  }
}

async function getIntegrationValue(provider, key, envKey = key) {
  const record = await getIntegrationRecord(provider, key);
  return record?.value || process.env[envKey] || "";
}

async function listIntegrationSettings() {
  let records = [];
  try {
    records = await prisma.integrationSetting.findMany();
  } catch (err) {
    records = [];
  }
  const byKey = new Map(records.map((item) => [`${item.provider}.${item.key}`, item]));

  return INTEGRATION_CATALOG.map((group) => ({
    ...group,
    settings: group.settings.map((setting) => {
      const record = byKey.get(`${group.provider}.${setting.key}`);
      const envValue = process.env[setting.envKey || setting.key] || "";
      const hasValue = !!(record?.value || envValue);
      const source = record?.value ? "database" : envValue ? "environment" : "missing";
      const rawValue = record?.value || envValue;
      return {
        ...setting,
        hasValue,
        source,
        value: setting.secret ? "" : rawValue,
        maskedValue: hasValue ? maskValue(rawValue) : "",
        updatedAt: record?.updatedAt || null,
        updatedBy: record?.updatedBy || null,
      };
    }),
  }));
}

async function upsertIntegrationSetting({ provider, key, value, isSecret = true, updatedBy }) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) throw new Error("Value is required");
  return prisma.integrationSetting.upsert({
    where: { provider_key: { provider, key } },
    update: { value: cleanValue, isSecret, updatedBy },
    create: { provider, key, value: cleanValue, isSecret, updatedBy },
  });
}

module.exports = {
  INTEGRATION_CATALOG,
  getIntegrationValue,
  listIntegrationSettings,
  maskValue,
  upsertIntegrationSetting,
};
