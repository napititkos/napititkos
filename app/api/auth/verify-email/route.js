export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get('token');

  function redirect(path) {
    return new Response(null, { status: 302, headers: { Location: `${origin}${path}` } });
  }

  if (!token) return redirect('/login?verify=missing');

  const record = await kv.get(`verifyemail:${token}`);
  if (!record) return redirect('/login?verify=expired');

  await kv.del(`verifyemail:${token}`);

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
