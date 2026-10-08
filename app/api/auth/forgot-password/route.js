export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { sendPasswordResetEmail } from '../../../../lib/mailer';
import { getSiteUrl } from '../../../../lib/siteUrl';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';
import { RESET_TTL_SECONDS, newResetToken, resetKey } from '../../../../lib/passwordReset';

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// "Elfelejtetted a jelszavad?": egyszer használatos, 1 óráig érvényes linket küld a címre.
// A válasz mindig ugyanaz, akár tartozik fiók a címhez, akár nem (nem árulja el, kinek van
// fiókja). Tiltott fióknak nem küldünk linket. Google-lal létrehozott fiók is kérhet így
// jelszót: a link csak a cím tulajdonosához jut el.
export async function POST(req) {
  const body = (await readJson(req, 2000)) || {};
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: 'Érvénytelen email cím.' }, { status: 400 });
  }
  // Levélbombázás és költség ellen: címenként 3, IP-nként 10 kérés óránként.
  if (
    (await isLimited('pwreset:email', email, 3, 3600)) ||
    (await isLimited('pwreset:ip', clientIp(req), 10, 3600))
  ) {
    return tooMany(3600);
  }

  const id = await kv.get(`au:userByEmail:${email}`);
  const user = id ? await kv.get(`au:user:${id}`) : null;
  if (user && !user.banned) {
    const token = newResetToken();
    const key = resetKey(token);
    await kv.set(key, { uid: user.id, email }, RESET_TTL_SECONDS);
    try {
      await sendPasswordResetEmail(email, `${getSiteUrl()}/reset-password?token=${token}`);
    } catch (err) {
      console.error('Jelszó-visszaállító email hiba:', err.message);
      await kv.del(key);
    }
  }
  return Response.json({ ok: true });
}
