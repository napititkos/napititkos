export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '../../../../lib/session';

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get('token');

  function redirect(path, extraHeaders = {}) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${origin}${path}`, ...extraHeaders },
    });
  }

  if (!token) {
    return redirect('/login?error=missing_token');
  }

  const record = await kv.get(`authtoken:${token}`);
  if (!record) {
    return redirect('/login?error=expired');
  }
  // Egyszer használatos token - azonnal töröljük.
  await kv.del(`authtoken:${token}`);

  const email = record.email;
  let user = await kv.get(`user:${email}`);
  if (!user) {
    user = { email, name: email.split('@')[0], role: 'user', createdAt: Date.now() };
    await kv.set(`user:${email}`, user);
  }

  const sessionId = await createSession(email);

  return redirect('/', {
    'Set-Cookie': `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`,
  });
}
