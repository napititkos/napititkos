export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { todayStr } from '../../../../lib/date';
import { miniLive } from '../../../../lib/mini';
import { sudokuLbKey, sudokuLbNamesKey, sudokuSize } from '../../../../lib/sudoku';

// A mai sudoku ranglistája (?size=9: a 9x9-esé): a gyorsabb megoldás van elöl.
export async function GET(req) {
  if (!miniLive()) return Response.json({ live: false, entries: [] });
  const date = todayStr();
  const size = sudokuSize(new URL(req.url).searchParams.get('size'));
  const r = kv.raw();
  const [all, names] = await Promise.all([r.hgetall(sudokuLbKey(date, size)), r.hgetall(sudokuLbNamesKey(date, size))]);
  const entries = Object.entries(all || {})
    .map(([k, v]) => ({ name: names?.[k] || 'Névtelen', elapsed: Number(v) || 0 }))
    .filter((e) => e.elapsed > 0)
    .sort((a, b) => a.elapsed - b.elapsed)
    .slice(0, 50);
  return Response.json({ live: true, date, size, entries }, { headers: { 'Cache-Control': 'public, s-maxage=20' } });
}
