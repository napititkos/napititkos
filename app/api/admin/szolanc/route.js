export const dynamic = 'force-dynamic';

import { isAdminRequest } from '../../../../lib/adminAuth';
import { todayStr, isValidDateStr } from '../../../../lib/date';
import { readJson } from '../../../../lib/validate';
import { allShortestPaths, fitsLevel, generateSzolanc, isWord, levelOf, ladderInfo, suggestSzolanc, szolancLevel } from '../../../../lib/szolancServer';
import { pickSzolanc, szolancSchedule, unpickSzolanc } from '../../../../lib/szolancStore';

const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });
const addDays = (d, n) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const DAYS = 21;

// Admin – Szólánc: a mai és a következő 20 nap (beemelt vagy automatikus feladvány), a soron
// következő szabad nap (holnaptól; a mait már játsszák) és annak nehézsége.
async function state() {
  const today = todayStr();
  const sched = await szolancSchedule();
  const days = [];
  for (let i = 0; i < DAYS; i++) {
    const d = addDays(today, i);
    const picked = sched[d] || null;
    const auto = picked ? null : generateSzolanc(d);
    const p = picked || auto;
    days.push({ date: d, level: szolancLevel(d), picked: !!picked, start: p?.start, end: p?.end, par: p?.par, paths: p?.paths, allPaths: p ? allShortestPaths(p.start, p.end, 6) : [] });
  }
  let next = null;
  for (let i = 1; i < 400 && !next; i++) {
    const d = addDays(today, i);
    if (!sched[d]) next = d;
  }
  return { today, days, next, nextLevel: next ? szolancLevel(next) : null, used: Object.values(sched).map((v) => `${v.start}>${v.end}`) };
}

export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  return Response.json(await state(), { headers: { 'Cache-Control': 'no-store' } });
}

// Műveletek:
//   suggest { level, count, exclude[] }  – javaslatok (count darab, a kezdő>cél párok kihagyásával)
//   pick { start, end }                  – beemelés a soron következő szabad napra (holnaptól)
//   remove { date }                      – egy jövőbeli beemelés törlése (a nap ismét automatikus)
export async function POST(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await readJson(req, 20000)) || {};
  if (body.action === 'suggest') {
    const level = Math.min(5, Math.max(1, Number(body.level) || 1));
    const count = Math.min(10, Math.max(1, Number(body.count) || 10));
    const exclude = Array.isArray(body.exclude) ? body.exclude.map(String).slice(0, 500) : [];
    const s = await state();
    return Response.json({ ok: true, level, suggestions: suggestSzolanc(level, count, [...exclude, ...s.used], `${Date.now()}-${Math.random()}`) });
  }
  if (body.action === 'pick') {
    const start = String(body.start || '').toLowerCase();
    const end = String(body.end || '').toLowerCase();
    if (!isWord(start) || !isWord(end)) return Response.json({ error: 'bad-word' }, { status: 400 });
    const s = await state();
    if (!s.next) return Response.json({ error: 'no-day' }, { status: 400 });
    const info = ladderInfo(start, end);
    if (!fitsLevel(info.d, info.paths, [...start].length, s.nextLevel)) {
      const lv = levelOf(info.d, info.paths);
      return Response.json({ error: 'level-mismatch', message: `A soron következő nap (${s.next}) ${s.nextLevel}/5-ös, ez a feladvány ${lv || '?'}/5-ös.` }, { status: 400 });
    }
    const v = await pickSzolanc(s.next, start, end, s.nextLevel);
    return Response.json({ ok: true, date: s.next, picked: v, ...(await state()) });
  }
  if (body.action === 'remove') {
    const date = String(body.date || '');
    if (!isValidDateStr(date) || date <= todayStr()) return Response.json({ error: 'bad-date', message: 'Csak jövőbeli nap beemelése törölhető.' }, { status: 400 });
    await unpickSzolanc(date);
    return Response.json({ ok: true, ...(await state()) });
  }
  return Response.json({ error: 'bad-action' }, { status: 400 });
}
