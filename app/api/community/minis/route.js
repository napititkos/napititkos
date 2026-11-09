export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { readJson } from '../../../../lib/validate';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { miniLive, validatePuzzle } from '../../../../lib/mini';
import { CMINI_KEY, cminiList, cminiSolvedKey, cminiReactionsKey, newCminiId } from '../../../../lib/communityMini';
import { tallyReactions } from '../../../../lib/emojis';

// Közösségi minik (csak élesítés után). GET: a lista (rács, kérdések, beküldő, megfejtők száma,
// a saját megfejtési idő); POST: új mini beküldése (bejelentkezve, megerősített fiókkal).
async function sessionUser() {
  try {
    return (await auth())?.user || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!miniLive()) return Response.json({ live: false, items: [] }, { headers: noStore });
  const u = await sessionUser();
  const list = (await cminiList()).slice().reverse();
  const r = kv.raw();
  const pl = r.pipeline();
  for (const m of list) {
    pl.hgetall(cminiSolvedKey(m.id));
    pl.hgetall(cminiReactionsKey(m.id));
  }
  const res = list.length ? await pl.exec() : [];
  const items = list.map((m, i) => {
    const solved = res[i * 2]?.[1] || {};
    const { counts } = tallyReactions(res[i * 2 + 1]?.[1] || {});
    return {
      id: m.id,
      rows: m.rows,
      entries: m.entries.map(({ dir, row, col, len, word, clue }) => ({ dir, row, col, len, word, clue })),
      name: m.name,
      createdAt: m.createdAt,
      promoted: !!m.promoted,
      solvers: Object.keys(solved).length,
      reactionCount: Object.values(counts).reduce((a, b) => a + b, 0),
      solvedMs: u?.id && solved[u.id] ? Number(solved[u.id]) : null,
      isOwner: !!(u?.email && String(m.submitterEmail || '').toLowerCase() === String(u.email).toLowerCase()),
    };
  });
  return Response.json({ live: true, items, isAdmin: u?.role === 'admin' }, { headers: noStore });
}

export async function POST(req) {
  if (!miniLive()) return Response.json({ error: 'not-live' }, { status: 404 });
  const u = await sessionUser();
  if (!u?.email) return Response.json({ error: 'unauthenticated', message: 'A beküldéshez jelentkezz be.' }, { status: 401 });
  if (!u.verified) return Response.json({ error: 'unverified', message: 'A beküldéshez meg kell erősítened az e-mail-címedet.' }, { status: 403 });
  if (await isLimited('cmini:post', u.id || clientIp(req), 10, 24 * 3600)) return tooMany(3600);
  const v = validatePuzzle((await readJson(req, 20000)) || {});
  if (typeof v === 'string') return Response.json({ error: 'invalid', message: v }, { status: 400 });
  const item = { id: newCminiId(), rows: v.rows, entries: v.entries, name: String(u.name || 'Névtelen').slice(0, 30), submitterEmail: u.email, createdAt: new Date().toISOString() };
  const ok = await kv.withLock('cmini', async () => {
    const list = await cminiList();
    list.push(item);
    await kv.set(CMINI_KEY, list);
    return true;
  });
  if (!ok) return Response.json({ error: 'busy' }, { status: 503 });
  return Response.json({ ok: true, id: item.id });
}
