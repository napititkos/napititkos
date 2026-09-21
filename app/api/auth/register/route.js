export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { hashPassword } from '../../../../lib/password';
import { sendVerificationEmail } from '../../../../lib/mailer';
import { getSiteUrl } from '../../../../lib/siteUrl';
import crypto from 'crypto';

const PENDING_TTL_SECONDS = 60 * 60 * 24; // 24 óra

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// A regisztráció NEM hoz létre és NEM módosít fiókot: a kért adatok (a jelszónak
// csak a hash-e) egy lejáró, "függő" rekordba kerülnek, és a fiók csak akkor jön
// létre, ha valaki rákattint az e-mailben küldött linkre (verify-email). Így a cím
// tulajdonosa nélkül sem új fiókot nem lehet a nevében nyitni, sem egy meglévő
// (pl. Google-lal létrehozott) fiókra jelszót tenni.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').toString().toLowerCase().trim();
  const password = (body.password || '').toString();
  const name = ((body.name || '').toString().trim() || email.split('@')[0]).slice(0, 60);

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: 'Érvénytelen email cím.' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ ok: false, error: 'A jelszónak legalább 8 karakteresnek kell lennie.' }, { status: 400 });
  }
  if (password.length > 200) {
    return Response.json({ ok: false, error: 'A jelszó legfeljebb 200 karakter lehet.' }, { status: 400 });
  }

  // Mindig kiszámoljuk, hogy a válaszidő ne áruljon el semmit a cím létezéséről.
  const passwordHash = hashPassword(password);

  const existingId = await kv.get(`au:userByEmail:${email}`);
  if (!existingId) {
    const token = crypto.randomBytes(24).toString('hex');
    await kv.set(`pendingreg:${token}`, { email, name, passwordHash }, PENDING_TTL_SECONDS);
    try {
      await sendVerificationEmail(email, `${getSiteUrl()}/api/auth/verify-email?token=${token}`);
    } catch (err) {
      console.error('Verification email failed:', err.message);
      await kv.del(`pendingreg:${token}`);
      return Response.json(
        { ok: false, error: 'Nem sikerült elküldeni a megerősítő emailt. Próbáld újra később.' },
        { status: 502 }
      );
    }
  }

  // Ugyanaz a válasz akkor is, ha a címhez már van fiók (nem áruljuk el, hogy van-e).
  return Response.json({ ok: true });
}
