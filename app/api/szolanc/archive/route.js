export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { todayStr } from '../../../../lib/date';
import { SZOLANC_START, szolancResKey } from '../../../../lib/szolancServer';
import { szolancForDate } from '../../../../lib/szolancStore';

// A korábbi napok Szóláncai (az indulás óta, legfeljebb egy évre visszamenőleg), a saját
// eredménnyel (lépések, idő). Bejelentkezve, mint a többi korábbi rejtvény.
const addDays = (d, n) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store' };
  let uid = null;
  try {
    uid = (await auth())?.user?.id || null;
  } catch {}
  if (!uid) return Response.json({ error: 'unauthenticated' }, { status: 401, headers: noStore });
  const today = todayStr();
  const dates = [];
  for (let d = addDays(today, -1); d >= SZOLANC_START && dates.length < 365; d = addDays(d, -1)) dates.push(d);
  const r = kv.raw();
  const items = [];
  for (const d of dates) {
    const p = await szolancForDate(d);
    if (!p) continue;
    let mine = null;
    try {
      mine = JSON.parse((await r.hget(szolancResKey(d), `u:${uid}`)) || 'null');
    } catch {}
    items.push({ date: d, number: p.number, level: p.level, start: p.start, end: p.end, par: p.par, paths: p.paths, steps: mine?.s || null, solvedMs: mine?.e || null });
  }
  return Response.json({ live: true, items }, { headers: noStore });
}
