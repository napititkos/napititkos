export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { todayStr } from '../../../../lib/date';
import { miniLive, miniStart } from '../../../../lib/mini';
import { SUDOKU_FIRST, sudokuNumber, sudokuResKey } from '../../../../lib/sudoku';

// A korábbi napok sudokui (az indulás óta), a saját idővel. Bejelentkezve, mint a többi korábbi
// rejtvény.
export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!miniLive()) return Response.json({ live: false, items: [] }, { headers: noStore });
  let uid = null;
  try {
    uid = (await auth())?.user?.id || null;
  } catch {}
  if (!uid) return Response.json({ error: 'unauthenticated' }, { status: 401, headers: noStore });
  const today = todayStr();
  const start = [miniStart() || '0000-00-00', SUDOKU_FIRST].sort().pop();
  const dates = (await kv.scan('sudoku:puzzle:*')).map((k) => k.slice('sudoku:puzzle:'.length)).filter((d) => d < today && d >= start).sort().reverse().slice(0, 365);
  const r = kv.raw();
  const pl = r.pipeline();
  for (const d of dates) {
    pl.get(`sudoku:puzzle:${d}`);
    pl.hget(sudokuResKey(d), `u:${uid}`);
  }
  const res = dates.length ? await pl.exec() : [];
  const items = dates.map((d, i) => {
    let p = null;
    try {
      p = JSON.parse(res[i * 2]?.[1] || 'null');
    } catch {}
    const mine = res[i * 2 + 1]?.[1];
    return { date: d, number: sudokuNumber(d), level: p?.level || 1, givens: p?.givens || [], solvedMs: mine ? Number(mine) : null };
  });
  return Response.json({ live: true, items }, { headers: noStore });
}
