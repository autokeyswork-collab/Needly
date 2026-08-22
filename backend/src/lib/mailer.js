const nodemailer = require("nodemailer");
const axios = require("axios");
const { getIntegrationValue } = require("./integrationSettings");

async function getMailConfig() {
  const host = await getIntegrationValue("brevo", "SMTP_HOST");
  const port = await getIntegrationValue("brevo", "SMTP_PORT");
  const secure = await getIntegrationValue("brevo", "SMTP_SECURE");
  const user = await getIntegrationValue("brevo", "SMTP_USER");
  const pass = await getIntegrationValue("brevo", "SMTP_PASS");
  const apiKey = await getIntegrationValue("brevo", "BREVO_API_KEY");
  const from = await getIntegrationValue("brevo", "MAIL_FROM");
  return { host, port, secure, user, pass, apiKey, from };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(text = "") {
  return escapeHtml(text).replace(/\n/g, "<br />");
}

function parseSender(value, fallbackEmail) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, "") || "Needly",
      email: match[2].trim(),
    };
  }
  return { name: "Needly", email: raw || fallbackEmail };
}

async function sendWithBrevoApi({ config, to, subject, text, html }) {
  const apiKey = config.apiKey || (String(config.pass || "").startsWith("xkeysib-") ? config.pass : "");
  if (!apiKey) throw new Error("Brevo API key is not configured");
  const sender = parseSender(config.from, config.user);
  const { data } = await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender,
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html || textToHtml(text),
    },
    {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: Number(process.env.BREVO_API_TIMEOUT_MS || 20000),
    }
  );
  return { sent: true, messageId: data?.messageId || null, provider: "brevo-api" };
}

async function sendWithSmtp({ config, to, subject, text, html }) {
  if (!(config.host && config.user && config.pass)) {
    return { sent: false, reason: "SMTP is not configured" };
  }

  const tx = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port || 587),
    secure: String(config.secure || "").toLowerCase() === "true",
    requireTLS: String(config.secure || "").toLowerCase() !== "true",
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000),
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      servername: config.host,
    },
  });
  const from = config.from || config.user;
  const info = await tx.sendMail({
    from,
    to,
    subject,
    text,
    html: html || textToHtml(text),
  });
  return { sent: true, messageId: info.messageId, provider: "smtp" };
}

async function sendMail({ to, subject, text, html }) {
  const config = await getMailConfig();
  try {
    return await sendWithSmtp({ config, to, subject, text, html });
  } catch (smtpErr) {
    const canTryApi = config.apiKey || String(config.pass || "").startsWith("xkeysib-");
    if (!canTryApi) throw smtpErr;
    try {
      return await sendWithBrevoApi({ config, to, subject, text, html });
    } catch (apiErr) {
      apiErr.message = `SMTP failed: ${smtpErr.message}; Brevo API failed: ${apiErr.response?.data?.message || apiErr.message}`;
      throw apiErr;
    }
  }
}

function appUrl(path = "") {
  const base = process.env.FRONTEND_BASE_URL || process.env.APP_PUBLIC_URL || "https://needly-frontend-seven.vercel.app";
  return `${base.replace(/\/$/, "")}${path}`;
}

module.exports = {
  appUrl,
  escapeHtml,
  sendMail,
};
