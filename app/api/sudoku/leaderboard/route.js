export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { todayStr } from '../../../../lib/date';
import { miniLive } from '../../../../lib/mini';
import { sudokuLbKey, sudokuLbNamesKey } from '../../../../lib/sudoku';

// A mai sudoku ranglistája: a gyorsabb megoldás van elöl.
export async function GET() {
  if (!miniLive()) return Response.json({ live: false, entries: [] });
  const date = todayStr();
  const r = kv.raw();
  const [all, names] = await Promise.all([r.hgetall(sudokuLbKey(date)), r.hgetall(sudokuLbNamesKey(date))]);
  const entries = Object.entries(all || {})
    .map(([k, v]) => ({ name: names?.[k] || 'Névtelen', elapsed: Number(v) || 0 }))
    .filter((e) => e.elapsed > 0)
    .sort((a, b) => a.elapsed - b.elapsed)
    .slice(0, 50);
  return Response.json({ live: true, date, entries }, { headers: { 'Cache-Control': 'public, s-maxage=20' } });
}
