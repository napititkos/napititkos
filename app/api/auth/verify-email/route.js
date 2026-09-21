export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import crypto from 'crypto';

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get('token');

  function redirect(path) {
    return new Response(null, { status: 302, headers: { Location: `${origin}${path}` } });
  }

  if (!token) return redirect('/login?verify=missing');

  // 1) Függő regisztráció: a fiók csak most jön létre, már megerősített címmel.
  const pending = await kv.take(`pendingreg:${token}`);
  if (pending) {
    const id = crypto.randomBytes(12).toString('hex');
    await kv.set(`au:user:${id}`, {
      id,
      email: pending.email,
      name: pending.name,
      image: null,
      emailVerified: new Date().toISOString(),
      role: 'user',
      passwordHash: pending.passwordHash,
    });
    // Atomikus foglalás: ha közben a címhez már létrejött fiók (pl. Google-lal),
    // azt nem írjuk felül és nem adunk rá jelszót.
    const claimed = await kv.setIfAbsent(`au:userByEmail:${pending.email}`, id);
    if (!claimed) {
      await kv.del(`au:user:${id}`);
      return redirect('/login?verify=exists');
    }
    return redirect('/login?verify=ok');
  }

  // 2) Már létező, még nem megerősített fiók megerősítése (resend-verification).
  const record = await kv.take(`verifyemail:${token}`);
  if (!record) return redirect('/login?verify=expired');

  const userId = await kv.get(`au:userByEmail:${record.email}`);
  if (userId) {
    const user = await kv.get(`au:user:${userId}`);
    if (user) {
      user.emailVerified = new Date().toISOString();
      await kv.set(`au:user:${userId}`, user);
    }
  }

  return redirect('/login?verify=ok');
}
