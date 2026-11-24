export const dynamic = 'force-dynamic';

import { todayStr, isValidDateStr } from '../../../lib/date';
import { kv } from '../../../lib/kv';
import { auth } from '../../../auth';
import { actorFor } from '../../../lib/reactions';
import { SZOLANC_START, szolancResKey } from '../../../lib/szolanc';
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
  // Ha a szereplő (fiók, vagy vendégként ez az eszköz) már megfejtette, a saját eredménye és a lánca
  // is jön: a játék megfejtett állapotban jelenik meg, újra nem tölthető ki (más eszközön sem).
  // Bejelentkezve az ezen az eszközön vendégként beküldött megoldás is az övé lesz.
  let user = null;
  try {
    user = (await auth())?.user || null;
  } catch {}
  const sp = new URL(req.url).searchParams;
  const actor = actorFor(user?.id || null, sp.get('device'));
  const devActor = user?.id ? actorFor(null, sp.get('device')) : null;
  const r = kv.raw();
  let mineRaw = actor ? await r.hget(szolancResKey(date), actor) : null;
  if (!mineRaw && devActor) {
    mineRaw = await r.hget(szolancResKey(date), devActor);
    if (mineRaw && actor) await r.hset(szolancResKey(date), actor, mineRaw);
  }
  let mine = null;
  try {
    const o = JSON.parse(mineRaw || 'null');
    if (o) mine = { steps: Number(o.s) || 0, elapsed: Number(o.e) || 0, chain: Array.isArray(o.c) ? o.c : null };
  } catch {}
  return Response.json({ date, start, end, level, par, paths, number, mine }, { headers: { 'Cache-Control': 'private, no-store' } });
}
