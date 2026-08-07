const nodemailer = require('nodemailer');

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'infosergiosvoixoff@gmail.com';

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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const joinList = (arr, extra) => {
  const items = [...arr];
  if (extra) items.push(`${extra} (précision)`);
  return items.join(', ');
};

// Construit les lignes "Label : valeur" en ignorant les champs vides,
// pour ne pas noyer Sergio sous des "(non précisé)" partout.
function buildSections(d) {
  const sections = [];

  sections.push({
    title: 'Coordonnées',
    lines: [
      ['Nom et prénom', d.fullName],
      ['Société', d.company],
      ['Email', d.email],
      ['Téléphone', d.phone],
    ],
  });

  const projectTypeLine = joinList(d.projectType, d.projectTypeOther);
  if (projectTypeLine) sections.push({ title: 'Type de projet', lines: [[null, projectTypeLine]] });

  const toneLine = joinList(d.voiceTone, d.voiceToneOther);
  if (toneLine || d.referenceLink) {
    sections.push({
      title: 'Ton / style de voix souhaité',
      lines: [
        [null, toneLine],
        ['Lien de référence', d.referenceLink],
      ],
    });
  }

  if (d.platform.length || d.broadcastZone.length || d.usageDuration.length) {
    sections.push({
      title: 'Plateforme de diffusion',
      lines: [
        ['Plateforme', d.platform.join(', ')],
        ['Zone géographique', d.broadcastZone.join(', ')],
        ["Durée d'exploitation souhaitée", d.usageDuration.join(', ')],
      ],
    });
  }

  if (d.length.length || d.longFormType.length) {
    sections.push({
      title: 'Détails techniques',
      lines: [
        ['Durée / nombre de mots', d.length.join(', ')],
        ['Type (si long métrage)', d.longFormType.join(', ')],
      ],
    });
  }

  if (d.scriptStatus) {
    sections.push({ title: 'Script', lines: [[null, d.scriptStatus]] });
  }

  if (d.deadline || d.deadlineDate) {
    sections.push({
      title: 'Délai souhaité',
      lines: [
        [null, d.deadline],
        ['Date précise', d.deadlineDate],
      ],
    });
  }

  if (d.audioMix) {
    sections.push({ title: 'Traitement audio (mixage / habillage sonore)', lines: [[null, d.audioMix]] });
  }

  if (d.deliveryFormat.length) {
    sections.push({ title: 'Format de livraison', lines: [[null, d.deliveryFormat.join(', ')]] });
  }

  if (d.message) {
    sections.push({ title: 'Précisions complémentaires', lines: [[null, d.message]] });
  }

  sections.push({
    title: 'Modalités de paiement',
    lines: [[null, 'Le client a accepté : acompte de 70 % avant enregistrement, solde de 30 % à la livraison.']],
  });

  return sections;
}

async function sendContactEmail(details, file) {
  const t = getTransporter();

  if (!t) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const sections = buildSections(details);

  const textParts = ['Nouvelle demande de devis via le site.', ''];
  const htmlParts = ['<h2>Nouvelle demande de devis</h2>'];

  sections.forEach((section) => {
    textParts.push(`— ${section.title} —`);
    htmlParts.push(`<h3>${escapeHtml(section.title)}</h3>`);
    section.lines.forEach(([label, value]) => {
      if (!value) return;
      textParts.push(label ? `${label} : ${value}` : value);
      htmlParts.push(
        label
          ? `<p><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value).replace(/\n/g, '<br>')}</p>`
          : `<p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`
      );
    });
    textParts.push('');
  });

  if (file) {
    textParts.push(`Script joint : ${file.originalname}`);
    htmlParts.push(`<p><strong>Script joint :</strong> ${escapeHtml(file.originalname)}</p>`);
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: CONTACT_TO_EMAIL,
    replyTo: details.email,
    subject: `Nouvelle demande de devis — ${details.fullName}`,
    text: textParts.join('\n'),
    html: htmlParts.join('\n'),
    attachments: file
      ? [{ filename: file.originalname, content: file.buffer, contentType: file.mimetype }]
      : [],
  });
}

module.exports = { sendContactEmail };
