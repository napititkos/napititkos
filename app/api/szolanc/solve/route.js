export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { todayStr, isValidDateStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { cleanName, readJson } from '../../../../lib/validate';
import { actorFor } from '../../../../lib/reactions';
import { SZOLANC_LB_TTL, SZOLANC_START, checkChain, szolancLbKey, szolancLbNamesKey, szolancResKey } from '../../../../lib/szolancServer';
import { szolancForDate } from '../../../../lib/szolancStore';

// Szólánc megoldás beküldése: { date, chain[], elapsed, device, name? }. A szerver előveszi a nap
// feladványát (beemelt vagy a dátumból generált), és ellenőrzi a láncot. Szereplőnként az első megoldás számít
// (lépésszám és idő); a ranglistára csak a mai nap kerül fel. Válasz: statisztika.
export async function POST(req) {
  if (await isLimited('szolanc:solve:ip', clientIp(req), 120, 3600)) return tooMany(3600);
  const body = (await readJson(req, 6000)) || {};
  const date = String(body.date || '');
  const today = todayStr();
  if (!isValidDateStr(date) || date > today || date < SZOLANC_START) return Response.json({ error: 'not-found' }, { status: 404 });
  const p = await szolancForDate(date);
  const chain = Array.isArray(body.chain) ? body.chain.map((w) => String(w || '').toLowerCase()) : [];
  const steps = checkChain(p, chain);
  if (steps < 0) return Response.json({ error: 'wrong', message: 'Ez a lánc nem érvényes megoldás.' }, { status: 400 });
  let user = null;
  try {
    user = (await auth())?.user || null;
  } catch {}
  const actor = actorFor(user?.id || null, body.device);
  if (!actor) return Response.json({ error: 'invalid-device' }, { status: 400 });
  const elapsed = Math.max(2000, Math.min(24 * 3600 * 1000, Math.round(Number(body.elapsed) || 0)));
  const r = kv.raw();
  // A lánc is eltárolódik, hogy más eszközön (vagy bejelentkezés után) is megfejtettként látszódjon.
  const val = JSON.stringify({ s: steps, e: elapsed, c: chain });
  const first = await r.hsetnx(szolancResKey(date), actor, val);
  if (first && date === today) {
    await r.hset(szolancLbKey(date), actor, val);
    await r.hset(szolancLbNamesKey(date), actor, cleanName(user?.name || body.name || ''));
    await r.expire(szolancLbKey(date), SZOLANC_LB_TTL);
    await r.expire(szolancLbNamesKey(date), SZOLANC_LB_TTL);
  }
  const all = Object.values((await r.hgetall(szolancResKey(date))) || {}).map((v) => {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }).filter(Boolean);
  const mine = JSON.parse((await r.hget(szolancResKey(date), actor)) || 'null');
  return Response.json({
    ok: true,
    stats: { mine, count: all.length, avgSteps: all.length ? Math.round((all.reduce((a, b) => a + b.s, 0) / all.length) * 10) / 10 : null },
  });
}
