export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { sendVerificationEmail } from '../../../../lib/mailer';
import { getSiteUrl } from '../../../../lib/siteUrl';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { auth } from '../../../../auth';
import crypto from 'crypto';

const VERIFY_TTL_SECONDS = 60 * 60 * 24;

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ ok: false, error: 'Nincs bejelentkezve.' }, { status: 401 });
  }
  const email = session.user.email;
  // Levélbombázás ellen: fiókonként 3, IP-nként 20 újraküldés óránként.
  if (
    (await isLimited('resend:email', email.toLowerCase(), 3, 3600)) ||
    (await isLimited('resend:ip', clientIp(req), 20, 3600))
  ) {
    return tooMany(3600);
  }
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
