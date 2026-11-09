export const dynamic = 'force-dynamic';

import { kv } from '../../../../../lib/kv';
import { auth } from '../../../../../auth';
import { readJson } from '../../../../../lib/validate';
import { isAdminRequest } from '../../../../../lib/adminAuth';
import { enqueuePuzzle, validatePuzzle } from '../../../../../lib/mini';
import { CMINI_KEY, cminiList, cminiReactionsKey, cminiSolvedKey } from '../../../../../lib/communityMini';

// Egy közösségi mini: POST { action: 'solve', elapsed } megfejtés (bejelentkezve);
// POST { action: 'promote' } beemelés a heti várólistára (admin); DELETE: törlés (beküldő vagy admin).
async function sessionUser() {
  try {
    return (await auth())?.user || null;
  } catch {
    return null;
  }
}

export async function POST(req, { params }) {
  const { id } = await params;
  const body = (await readJson(req, 1000)) || {};
  const list = await cminiList();
  const item = list.find((x) => x.id === id);
  if (!item) return Response.json({ error: 'not-found' }, { status: 404 });

  if (body.action === 'solve') {
    const u = await sessionUser();
    if (!u?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
    const elapsed = Math.round(Number(body.elapsed));
    if (!Number.isFinite(elapsed) || elapsed < 3000 || elapsed > 24 * 3600 * 1000) return Response.json({ error: 'invalid-time' }, { status: 400 });
    await kv.raw().hsetnx(cminiSolvedKey(id), u.id, String(elapsed));
    return Response.json({ ok: true });
  }

  if (body.action === 'promote') {
    if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
    if (item.promoted) return Response.json({ error: 'already', message: 'Ezt a minit már beemelték.' }, { status: 409 });
    const v = validatePuzzle(item);
    if (typeof v === 'string') return Response.json({ error: 'invalid', message: v }, { status: 400 });
    const q = await enqueuePuzzle(v);
    if (!q) return Response.json({ error: 'busy' }, { status: 503 });
    await kv.withLock('cmini', async () => {
      const l = await cminiList();
      const i = l.findIndex((x) => x.id === id);
      if (i >= 0) l[i] = { ...l[i], promoted: true, promotedAt: new Date().toISOString() };
      await kv.set(CMINI_KEY, l);
      return true;
    });
    return Response.json({ ok: true, queued: q.value?.id || null });
  }

  return Response.json({ error: 'unknown-action' }, { status: 400 });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const u = await sessionUser();
  const admin = await isAdminRequest(req);
  const ok = await kv.withLock('cmini', async () => {
    const list = await cminiList();
    const item = list.find((x) => x.id === id);
    if (!item) return 404;
    const owner = u?.email && String(item.submitterEmail || '').toLowerCase() === String(u.email).toLowerCase();
    if (!owner && !admin) return 403;
    await kv.set(CMINI_KEY, list.filter((x) => x.id !== id));
    await kv.raw().del(cminiSolvedKey(id), cminiReactionsKey(id));
    return 200;
  });
  if (!ok) return Response.json({ error: 'busy' }, { status: 503 });
  const code = ok.value;
  return Response.json(code === 200 ? { ok: true } : { error: code === 404 ? 'not-found' : 'forbidden' }, { status: code });
}
