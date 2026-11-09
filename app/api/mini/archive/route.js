export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { readJson } from '../../../../lib/validate';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { MINI_KEYS, miniLive, miniSolvesKey, weekStart } from '../../../../lib/mini';

// A korábbi heti minik (a mostani hét előttiek), csak élesítés után és bejelentkezve (mint a
// korábbi titkosírások). GET: a lista a saját megfejtési idővel; POST { week, elapsed }: megfejtés.
async function user() {
  try {
    return (await auth())?.user || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!miniLive()) return Response.json({ live: false, items: [] }, { headers: noStore });
  const u = await user();
  if (!u?.id) return Response.json({ error: 'unauthenticated' }, { status: 401, headers: noStore });
  const thisWeek = weekStart();
  const past = ((await kv.get(MINI_KEYS.published)) || []).filter((p) => p.week && p.week < thisWeek).reverse();
  const r = kv.raw();
  const pl = r.pipeline();
  for (const p of past) pl.hget(miniSolvesKey(p.week), `u:${u.id}`);
  const res = past.length ? await pl.exec() : [];
  const items = past.map((p, i) => ({
    id: p.id,
    week: p.week,
    rows: p.rows,
    entries: p.entries.map(({ dir, row, col, len, word, clue }) => ({ dir, row, col, len, word, clue })),
    solvedMs: res[i]?.[1] ? Number(res[i][1]) : null,
  }));
  return Response.json({ live: true, items }, { headers: noStore });
}

export async function POST(req) {
  if (await isLimited('mini:arch:ip', clientIp(req), 60, 3600)) return tooMany(3600);
  const u = await user();
  if (!u?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const body = (await readJson(req, 1000)) || {};
  const published = (await kv.get(MINI_KEYS.published)) || [];
  if (!published.some((p) => p.week === body.week && p.week < weekStart())) return Response.json({ error: 'not-found' }, { status: 404 });
  const elapsed = Math.round(Number(body.elapsed));
  if (!Number.isFinite(elapsed) || elapsed < 3000 || elapsed > 24 * 3600 * 1000) return Response.json({ error: 'invalid-time' }, { status: 400 });
  await kv.raw().hsetnx(miniSolvesKey(body.week), `u:${u.id}`, String(elapsed));
  return Response.json({ ok: true });
}
