export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { hashPassword } from '../../../../lib/password';
import { sendVerificationEmail } from '../../../../lib/mailer';
import crypto from 'crypto';

const VERIFY_TTL_SECONDS = 60 * 60 * 24; // 24 óra

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendVerification(email, req) {
  const token = crypto.randomBytes(24).toString('hex');
  await kv.set(`verifyemail:${token}`, { email }, VERIFY_TTL_SECONDS);
  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
  const link = `${origin}/api/auth/verify-email?token=${token}`;
  try {
    await sendVerificationEmail(email, link);
  } catch (err) {
    // Ha az email küldése nem sikerül, a regisztráció akkor is érvényes marad -
    // csak a megerősítés marad el, ezt nem akarjuk, hogy elvágja a belépést.
    console.error('Verification email failed:', err.message);
  }
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').toString().toLowerCase().trim();
  const password = (body.password || '').toString();
  const name = (body.name || '').toString().trim() || email.split('@')[0];

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: 'Érvénytelen email cím.' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ ok: false, error: 'A jelszónak legalább 8 karakteresnek kell lennie.' }, { status: 400 });
  }

  const existingId = await kv.get(`au:userByEmail:${email}`);
  if (existingId) {
    const existingUser = await kv.get(`au:user:${existingId}`);
    if (existingUser?.passwordHash) {
      return Response.json({ ok: false, error: 'Ezzel az email címmel már van fiók. Jelentkezz be helyette.' }, { status: 409 });
    }
    // Volt már fiók (pl. Google-lal), csak most kap jelszót is.
    const updated = { ...existingUser, passwordHash: hashPassword(password), name: existingUser.name || name };
    await kv.set(`au:user:${existingId}`, updated);
    await sendVerification(email, req);
    return Response.json({ ok: true });
  }

  const id = crypto.randomBytes(12).toString('hex');
  const user = {
    id,
    email,
    name,
    image: null,
    emailVerified: null,
    role: 'user',
    passwordHash: hashPassword(password),
  };
  await kv.set(`au:user:${id}`, user);
  await kv.set(`au:userByEmail:${email}`, id);

  await sendVerification(email, req);

  return Response.json({ ok: true });
}
