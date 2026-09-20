export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';

export async function GET(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const keys = await kv.keys('au:user:*');
  const users = [];
  for (const key of keys) {
    const user = await kv.get(key);
    if (user?.email) {
      users.push({
        id: user.id,
        email: user.email,
        name: user.name || '',
        role: user.role || 'user',
        emailVerified: !!user.emailVerified,
      });
    }
  }
  users.sort((a, b) => a.email.localeCompare(b.email));
  return Response.json({ users });
}

export async function PATCH(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, role } = body;
  if (!id || !['user', 'admin'].includes(role)) {
    return Response.json({ error: 'invalid-body' }, { status: 400 });
  }
  const user = await kv.get(`au:user:${id}`);
  if (!user) return Response.json({ error: 'not-found' }, { status: 404 });
  user.role = role;
  await kv.set(`au:user:${id}`, user);
  return Response.json({ ok: true });
}
