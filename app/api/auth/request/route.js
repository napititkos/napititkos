export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { kv } from '../../../../lib/kv';
import { sendMagicLinkEmail } from '../../../../lib/mailer';

const TOKEN_TTL_SECONDS = 15 * 60; // 15 perc

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: 'Érvénytelen email cím.' }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString('hex');
  await kv.set(`authtoken:${token}`, { email }, TOKEN_TTL_SECONDS);

  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
  const link = `${origin}/api/auth/verify?token=${token}`;

  try {
    await sendMagicLinkEmail(email, link);
  } catch (err) {
    return Response.json(
      { ok: false, error: `Nem sikerült elküldeni az emailt: ${err.message}` },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
