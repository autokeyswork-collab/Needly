const nodemailer = require("nodemailer");
const { getIntegrationValue } = require("./integrationSettings");

async function getMailConfig() {
  const host = await getIntegrationValue("brevo", "SMTP_HOST");
  const port = await getIntegrationValue("brevo", "SMTP_PORT");
  const secure = await getIntegrationValue("brevo", "SMTP_SECURE");
  const user = await getIntegrationValue("brevo", "SMTP_USER");
  const pass = await getIntegrationValue("brevo", "SMTP_PASS");
  const from = await getIntegrationValue("brevo", "MAIL_FROM");
  return { host, port, secure, user, pass, from };
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

async function sendMail({ to, subject, text, html }) {
  const config = await getMailConfig();
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
  return { sent: true, messageId: info.messageId };
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
