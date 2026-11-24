export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { todayStr } from '../../../../lib/date';
import { szolancLbKey, szolancLbNamesKey } from '../../../../lib/szolancServer';

// A mai Szólánc ranglistája: előbb a kevesebb lépés, azonos lépésszámnál a gyorsabb idő.
// A ranglista nem kerülhet a CDN gyorsítótárába: különben a megfejtés után (akár 20 mp-ig) a
// régi lista jönne, és a játékos nem látná magát rajta (a felúszás sem indulna el).
export async function GET() {
  const date = todayStr();
  const r = kv.raw();
  const [all, names] = await Promise.all([r.hgetall(szolancLbKey(date)), r.hgetall(szolancLbNamesKey(date))]);
  const entries = Object.entries(all || {})
    .map(([k, v]) => {
      let o = null;
      try {
        o = JSON.parse(v);
      } catch {}
      return o ? { name: names?.[k] || 'Névtelen', steps: Number(o.s) || 0, elapsed: Number(o.e) || 0 } : null;
    })
    .filter((e) => e && e.steps > 0)
    .sort((a, b) => a.steps - b.steps || a.elapsed - b.elapsed)
    .slice(0, 50);
  return Response.json({ live: true, date, entries }, { headers: { 'Cache-Control': 'no-store' } });
}
