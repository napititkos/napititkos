export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { kv } from '../../../lib/kv';
import { auth } from '../../../auth';
import { todayStr, isValidDateStr } from '../../../lib/date';
import { miniLive } from '../../../lib/mini';
import { actorFor } from '../../../lib/reactions';
import { szoFoundKey, szoForDate, szoResKey } from '../../../lib/szo';

// A napi szókereső (csak élesítés után). GET ?date=ÉÉÉÉ-HH-NN (alapból a mai) &device=...
// A rács, a kötelező és a bónuszszavak (az ellenőrzés a böngészőben történik), a napi szó, és a
// fiókhoz/eszközhöz eltárolt megtalált szavak (eszközök közti szinkron, 7 napig).
export async function GET(req) {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!miniLive()) return Response.json({ live: false }, { headers: noStore });
  const sp = new URL(req.url).searchParams;
  const today = todayStr();
  const date = sp.get('date') || today;
  if (!isValidDateStr(date) || date > today) return Response.json({ error: 'not-found' }, { status: 404, headers: noStore });
  const p = await szoForDate(date, { create: date === today });
  if (!p) return Response.json({ error: 'not-found' }, { status: 404, headers: noStore });
  let uid = null;
  try {
    uid = (await auth())?.user?.id || null;
  } catch {}
  const actor = actorFor(uid, sp.get('device'));
  const r = kv.raw();
  const [found, res] = actor ? await Promise.all([r.hget(szoFoundKey(date), actor), r.hget(szoResKey(date), actor)]) : [null, null];
  let mineFound = [];
  try {
    mineFound = found ? JSON.parse(found) : [];
  } catch {}
  const [c, e, pts] = res ? String(res).split(':').map(Number) : [null, null, null];
  return Response.json(
    {
      live: true,
      date,
      today: date === today,
      grid: p.grid,
      word: p.word,
      required: p.required,
      bonus: p.bonus,
      paths: p.paths,
      mine: { found: mineFound, count: c, elapsed: e, points: pts ?? null },
    },
    { headers: noStore }
  );
}
