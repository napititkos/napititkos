// A linket HTML-attribútumba írjuk, ezért escape-eljük.
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Egyszerű email-küldés a Resend REST API-ján keresztül, külön csomag nélkül.
async function sendEmail({ to, subject, intro, buttonText, link, footer }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Hiányzik a RESEND_API_KEY környezeti változó.');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Titkosírás <titkositas@napititkos.hu>',
      to: [to],
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#D6456B;">Titkosírás</h2>
          <p>${intro}</p>
          <p style="margin: 24px 0;">
            <a href="${escapeHtml(link)}" style="background:#D6456B;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;">
              ${buttonText}
            </a>
          </p>
          <p style="color:#8B84A3;font-size:13px;">
            ${footer}
          </p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend hiba (${res.status}): ${text}`);
  }
  return res.json();
}

export function sendVerificationEmail(email, link) {
  return sendEmail({
    to: email,
    subject: 'Erősítsd meg az email címed - Titkosírás',
    intro: 'Köszönjük a regisztrációt! Kattints az alábbi gombra az email címed megerősítéséhez.',
    buttonText: 'Email cím megerősítése',
    link,
    footer: 'Ha nem te regisztráltál, nyugodtan hagyd figyelmen kívül ezt az emailt.',
  });
}

export function sendMagicLinkEmail(email, link) {
  return sendEmail({
    to: email,
    subject: 'Belépés a Titkosíráshoz',
    intro: 'Kattints az alábbi gombra a bejelentkezéshez. A link 15 percig érvényes.',
    buttonText: 'Belépés',
    link,
    footer: 'Ha nem te kérted ezt a linket, nyugodtan hagyd figyelmen kívül ezt az emailt.',
  });
}
