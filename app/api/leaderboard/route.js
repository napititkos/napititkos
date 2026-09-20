export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { todayStr } from '../../../lib/date';

function sortEntries(list) {
  return [...list].sort((a, b) => {
    if (a.hintsUsed !== b.hintsUsed) return a.hintsUsed - b.hintsUsed;
    return a.elapsed - b.elapsed;
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const date = body.date || todayStr();
  const name = (body.name || 'Névtelen').toString().slice(0, 40);
  const hintsUsed = Number(body.hintsUsed || 0);
  const elapsed = Number(body.elapsed || 0);
  const key = `leaderboard:${date}`;
  const list = (await kv.get(key)) || [];
  list.push({ name, hintsUsed, elapsed, ts: Date.now() });
  const trimmed = sortEntries(list).slice(0, 100);
  await kv.set(key, trimmed);
  return Response.json({ ok: true });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || todayStr();
  const key = `leaderboard:${date}`;
  const list = (await kv.get(key)) || [];
  return Response.json({ entries: sortEntries(list).slice(0, 20) });
}
