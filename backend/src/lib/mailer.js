const nodemailer = require("nodemailer");

let transporter;

function configured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!configured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
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
  const tx = getTransporter();
  if (!tx) {
    return { sent: false, reason: "SMTP is not configured" };
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
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
