export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { todayStr } from '../../../../lib/date';
import { miniLive } from '../../../../lib/mini';
import { szoLbKey, szoLbNamesKey } from '../../../../lib/szo';

// A mai szókereső ranglistája: elöl a több pont (a kötelező szavak hossza szerint), egyenlőségnél a
// gyorsabb.
export async function GET() {
  if (!miniLive()) return Response.json({ live: false, entries: [] });
  const date = todayStr();
  const r = kv.raw();
  const [all, names] = await Promise.all([r.hgetall(szoLbKey(date)), r.hgetall(szoLbNamesKey(date))]);
  const entries = Object.entries(all || {})
    .map(([k, v]) => {
      try {
        const o = JSON.parse(v);
        return { name: names?.[k] || 'Névtelen', count: Number(o.c) || 0, points: Number(o.p) || 0, elapsed: Number(o.e) || 0 };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.points - a.points || a.elapsed - b.elapsed)
    .slice(0, 50);
  return Response.json({ live: true, date, entries }, { headers: { 'Cache-Control': 'public, s-maxage=20' } });
}
