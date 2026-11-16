export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { todayStr } from '../../../../lib/date';
import { miniLive, miniStart } from '../../../../lib/mini';
import { SUDOKU_FIRST, sudokuForDate, sudokuNumber, sudokuPuzzleKey, sudokuResKey, sudokuSize } from '../../../../lib/sudoku';

// A korábbi napok sudokui (az indulás óta), a saját idővel. ?size=9: a 9x9-es archívum (külön
// lista); a még el nem készült korábbi 9x9-esek ilyenkor elkészülnek (a dátumból mindig ugyanaz).
// Bejelentkezve, mint a többi korábbi rejtvény.
export async function GET(req) {
  const size = sudokuSize(new URL(req.url).searchParams.get('size'));
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
    pl.get(sudokuPuzzleKey(d, size));
    pl.hget(sudokuResKey(d, size), `u:${uid}`);
  }
  const res = dates.length ? await pl.exec() : [];
  const items = [];
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    let p = null;
    try {
      p = JSON.parse(res[i * 2]?.[1] || 'null');
    } catch {}
    if (!p && size === 9) p = await sudokuForDate(d, { size: 9 });
    const mine = res[i * 2 + 1]?.[1];
    items.push({ date: d, number: sudokuNumber(d), size, level: p?.level || 1, givens: p?.givens || [], solvedMs: mine ? Number(mine) : null });
  }
  return Response.json({ live: true, size, items }, { headers: noStore });
}
