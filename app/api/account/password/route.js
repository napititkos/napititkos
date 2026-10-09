export const dynamic = 'force-dynamic';

import { auth } from '../../../../auth';
import { kv } from '../../../../lib/kv';
import { MAX_PASSWORD_LENGTH, hashPassword, verifyPassword } from '../../../../lib/password';
import { isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';

// Van-e a fióknak jelszava (Google-lal vagy belépő linkkel létrehozott fióknak nincs).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const user = await kv.get(`au:user:${session.user.id}`);
  return Response.json({ hasPassword: !!user?.passwordHash }, { headers: { 'Cache-Control': 'private, no-store' } });
}

// Jelszó módosítása a jelenlegi jelszóval. Jelszó nélküli fiók itt nem állíthat be jelszót
// (azt az e-mailben küldött visszaállító linkkel teheti meg, ami a cím birtoklását igazolja).
// Sikeres csere után a fiók többi eszközén futó munkamenetek megszűnnek; a felület ezen az
// eszközön az új jelszóval azonnal újra beléptet.
export async function POST(req) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  if (await isLimited('pwchange:user', session.user.id, 10, 3600)) return tooMany(3600);
  const body = (await readJson(req, 2000)) || {};
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';
  const next2 = typeof body.newPassword2 === 'string' ? body.newPassword2 : '';
  if (next.length < 8) return Response.json({ error: 'short', message: 'Az új jelszónak legalább 8 karakteresnek kell lennie.' }, { status: 400 });
  if (next.length > MAX_PASSWORD_LENGTH) return Response.json({ error: 'long', message: `A jelszó legfeljebb ${MAX_PASSWORD_LENGTH} karakter lehet.` }, { status: 400 });
  if (next !== next2) return Response.json({ error: 'mismatch', message: 'A két új jelszó nem egyezik.' }, { status: 400 });

  const id = session.user.id;
  const user = await kv.get(`au:user:${id}`);
  if (!user?.passwordHash) {
    return Response.json({ error: 'no-password', message: 'A fiókodnak még nincs jelszava. Állíts be egyet az e-mailben küldött linkkel.' }, { status: 409 });
  }
  if (!(await verifyPassword(current, user.passwordHash))) {
    return Response.json({ error: 'wrong-password', message: 'A jelenlegi jelszó nem helyes.' }, { status: 400 });
  }
  const passwordHash = await hashPassword(next);
  const result = await kv.withLock(`user:${id}`, async () => {
    const fresh = await kv.get(`au:user:${id}`);
    if (!fresh) return 'gone';
    fresh.passwordHash = passwordHash;
    fresh.sessionsValidAfter = Date.now();
    await kv.set(`au:user:${id}`, fresh);
    return 'ok';
  });
  if (!result) return Response.json({ error: 'busy' }, { status: 503 });
  if (result.value !== 'ok') return Response.json({ error: 'not-found' }, { status: 404 });
  return Response.json({ ok: true });
}
