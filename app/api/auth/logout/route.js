export const dynamic = 'force-dynamic';

import { destroySession, SESSION_COOKIE_NAME } from '../../../../lib/session';

export async function POST(req) {
  await destroySession(req);
  const res = Response.json({ ok: true });
  res.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
  return res;
}
