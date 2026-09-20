// Egyszerű email-küldés a Resend REST API-ján keresztül, külön csomag nélkül.
export async function sendMagicLinkEmail(email, link) {
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
      to: [email],
      subject: 'Belépés a Titkosíráshoz',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#D6456B;">Titkosírás</h2>
          <p>Kattints az alábbi gombra a bejelentkezéshez. A link 15 percig érvényes.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background:#D6456B;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;">
              Belépés
            </a>
          </p>
          <p style="color:#8B84A3;font-size:13px;">
            Ha nem te kérted ezt a linket, nyugodtan hagyd figyelmen kívül ezt az emailt.
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
