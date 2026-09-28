export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { adminUser, isAdminRequest } from '../../../../lib/adminAuth';
import { readJson } from '../../../../lib/validate';

export async function GET(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const keys = await kv.scan('au:user:*');
  const records = await kv.mget(keys);
  const users = [];
  for (const user of records) {
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
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await readJson(req, 2000)) || {};
  const { id, role } = body;
  if (typeof id !== 'string' || !['user', 'admin'].includes(role)) {
    return Response.json({ error: 'invalid-body' }, { status: 400 });
  }
  // A saját admin jogát senki nem veheti el magától (különben kizárná magát, és ha ő az
  // egyetlen admin, az admin felülethez senki nem férne hozzá).
  const me = await adminUser();
  if (me && me.id === id && role !== 'admin') {
    return Response.json({ error: 'self-demote', message: 'A saját admin jogodat nem veheted el.' }, { status: 409 });
  }
  const user = await kv.get(`au:user:${id}`);
  if (!user) return Response.json({ error: 'not-found' }, { status: 404 });
  user.role = role;
  await kv.set(`au:user:${id}`, user);
  return Response.json({ ok: true });
}
