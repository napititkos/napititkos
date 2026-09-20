export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { hashPassword } from '../../../../lib/password';
import crypto from 'crypto';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  return Response.json({ ok: true });
}
