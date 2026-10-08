export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { MAX_PASSWORD_LENGTH, hashPassword } from '../../../../lib/password';
import { clearFailures, clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';
import { isResetTokenFormat, resetKey } from '../../../../lib/passwordReset';

const EXPIRED = { ok: false, error: 'expired', message: 'A link lejárt vagy már felhasználtad. Kérj egy újat a bejelentkezésnél.' };

// Új jelszó beállítása a visszaállító linkkel. A token egyszer használatos (kv.take), a
// jelszót előbb ellenőrizzük, hogy egy elgépelt (túl rövid) jelszó ne "égesse el" a linket.
// Sikeres csere után a fiók többi eszközén futó munkamenetek megszűnnek (sessionsValidAfter).
export async function POST(req) {
  if (await isLimited('pwreset:try:ip', clientIp(req), 20, 3600)) return tooMany(3600);
  const body = (await readJson(req, 2000)) || {};
  const token = body.token;
  const password = typeof body.password === 'string' ? body.password : '';
  if (!isResetTokenFormat(token)) return Response.json(EXPIRED, { status: 400 });
  if (password.length < 8) {
    return Response.json({ ok: false, error: 'short', message: 'A jelszónak legalább 8 karakteresnek kell lennie.' }, { status: 400 });
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return Response.json({ ok: false, error: 'long', message: `A jelszó legfeljebb ${MAX_PASSWORD_LENGTH} karakter lehet.` }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  const rec = await kv.take(resetKey(token));
  if (!rec?.uid) return Response.json(EXPIRED, { status: 400 });

  const result = await kv.withLock(`user:${rec.uid}`, async () => {
    const user = await kv.get(`au:user:${rec.uid}`);
    // A fiók azóta törölve, tiltva lett, vagy már nem ehhez a címhez tartozik.
    if (!user || user.banned || String(user.email || '').toLowerCase() !== rec.email) return 'invalid';
    user.passwordHash = passwordHash;
    // A link a cím birtoklását igazolja, így a cím ezzel megerősítettnek számít.
    if (!user.emailVerified) user.emailVerified = new Date().toISOString();
    user.sessionsValidAfter = Date.now();
    await kv.set(`au:user:${rec.uid}`, user);
    return 'ok';
  });
  if (!result) return Response.json({ ok: false, error: 'busy' }, { status: 503 });
  if (result.value !== 'ok') return Response.json(EXPIRED, { status: 400 });
  await clearFailures('login:email', rec.email);
  return Response.json({ ok: true });
}
