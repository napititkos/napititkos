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
        banned: !!user.banned,
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
  // Fióktiltás / feloldás: { id, banned: true | false }.
  if (typeof body.banned === 'boolean') return setBanned(id, body.banned);
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
  if (role === 'admin' && user.banned) {
    return Response.json({ error: 'banned', message: 'Letiltott fióknak nem adható admin jog.' }, { status: 409 });
  }
  user.role = role;
  await kv.set(`au:user:${id}`, user);
  return Response.json({ ok: true });
}

// Fióktiltás. A saját fiókját senki nem tilthatja le, admin fiókot pedig csak az admin jog
// visszavonása után lehet (így a tiltás nem zárhat ki véletlenül egy admint). A tiltott fiók
// nem tud belépni, és a meglévő munkamenetei is azonnal megszűnnek (lásd lib/ban.js, auth.js).
async function setBanned(id, banned) {
  if (typeof id !== 'string' || !id) return Response.json({ error: 'invalid-body' }, { status: 400 });
  const me = await adminUser();
  if (banned && me && me.id === id) {
    return Response.json({ error: 'self-ban', message: 'A saját fiókodat nem tilthatod le.' }, { status: 409 });
  }
  const locked = await kv.withLock(`user:${id}`, async () => {
    const user = await kv.get(`au:user:${id}`);
    if (!user) return 'not-found';
    if (banned && user.role === 'admin') return 'admin';
    if (banned) user.banned = { at: new Date().toISOString(), by: me?.id || null };
    else delete user.banned;
    await kv.set(`au:user:${id}`, user);
    return 'ok';
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  if (locked.value === 'not-found') return Response.json({ error: 'not-found' }, { status: 404 });
  if (locked.value === 'admin') {
    return Response.json(
      { error: 'admin', message: 'Admin fiókot nem lehet letiltani. Előbb vond vissza az admin jogát.' },
      { status: 409 }
    );
  }
  return Response.json({ ok: true, banned });
}
