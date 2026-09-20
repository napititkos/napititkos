export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { sendVerificationEmail } from '../../../../lib/mailer';
import { auth } from '../../../../auth';
import crypto from 'crypto';

const VERIFY_TTL_SECONDS = 60 * 60 * 24;

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ ok: false, error: 'Nincs bejelentkezve.' }, { status: 401 });
  }
  const email = session.user.email;
  const token = crypto.randomBytes(24).toString('hex');
  await kv.set(`verifyemail:${token}`, { email }, VERIFY_TTL_SECONDS);
  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
  const link = `${origin}/api/auth/verify-email?token=${token}`;
  try {
    await sendVerificationEmail(email, link);
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
