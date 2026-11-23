export const dynamic = 'force-dynamic';

import { todayStr, isValidDateStr } from '../../../lib/date';
import { SZOLANC_START } from '../../../lib/szolanc';
import { szolancForDate } from '../../../lib/szolancStore';

// A nap Szólánca (?date=ÉÉÉÉ-HH-NN: korábbi nap, jövőbeli nem): kezdő- és célszó, nehézség,
// legrövidebb út hossza és a legrövidebb utak száma. Ha az admin beemelt egyet erre a napra, az.
export async function GET(req) {
  const today = todayStr();
  const q = new URL(req.url).searchParams.get('date');
  const date = q && isValidDateStr(q) ? q : today;
  if (date > today || date < SZOLANC_START) return Response.json({ error: 'not-found' }, { status: 404 });
  const p = await szolancForDate(date);
  if (!p) return Response.json({ error: 'not-found' }, { status: 404 });
  const { start, end, level, par, paths, number } = p;
  return Response.json({ date, start, end, level, par, paths, number }, { headers: { 'Cache-Control': 'no-store' } });
}
