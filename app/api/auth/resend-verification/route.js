export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { sendVerificationEmail } from '../../../../lib/mailer';
import { getSiteUrl } from '../../../../lib/siteUrl';
import { auth } from '../../../../auth';
import crypto from 'crypto';

const VERIFY_TTL_SECONDS = 60 * 60 * 24;

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ ok: false, error: 'Nincs bejelentkezve.' }, { status: 401 });
  }
  const email = session.user.email;
  const token = crypto.randomBytes(24).toString('hex');
  await kv.set(`verifyemail:${token}`, { email }, VERIFY_TTL_SECONDS);
  const link = `${getSiteUrl()}/api/auth/verify-email?token=${token}`;
  try {
    await sendVerificationEmail(email, link);
  } catch (err) {
    // A belső hibaüzenetet (pl. a levélküldő szolgáltatóét) nem adjuk ki a kliensnek.
    console.error('Resend verification failed:', err.message);
    return Response.json({ ok: false, error: 'Nem sikerült elküldeni az emailt. Próbáld újra később.' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
