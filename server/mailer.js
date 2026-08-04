const nodemailer = require('nodemailer');

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'infosergiosvoix@gmail.com';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendContactEmail({ name, email, phone, message }) {
  const t = getTransporter();

  if (!t) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const text = [
    `Nouvelle demande de devis via le site.`,
    ``,
    `Nom / société : ${name}`,
    `Email : ${email}`,
    `Téléphone : ${phone || '(non renseigné)'}`,
    ``,
    `Message :`,
    message,
  ].join('\n');

  const html = `
    <h2>Nouvelle demande de devis</h2>
    <p><strong>Nom / société :</strong> ${escapeHtml(name)}</p>
    <p><strong>Email :</strong> ${escapeHtml(email)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(phone || '(non renseigné)')}</p>
    <p><strong>Message :</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `Nouvelle demande de devis — ${name}`,
    text,
    html,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendContactEmail };
