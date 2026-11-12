export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { auth } from '../../../auth';
import { todayStr, isValidDateStr } from '../../../lib/date';
import { miniLive } from '../../../lib/mini';
import { actorFor } from '../../../lib/reactions';
import { publicSudoku, sudokuForDate, sudokuNumber, sudokuResKey } from '../../../lib/sudoku';

// A napi (vagy ?date=-tel egy korábbi) sudoku, a saját korábbi idővel. Jövőbeli napot nem ad ki,
// és korábbi napot nem generál utólag.
export async function GET(req) {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!miniLive()) return Response.json({ live: false }, { headers: noStore });
  const sp = new URL(req.url).searchParams;
  const today = todayStr();
  const date = sp.get('date') || today;
  if (!isValidDateStr(date) || date > today) return Response.json({ error: 'not-found' }, { status: 404, headers: noStore });
  const p = await sudokuForDate(date, { create: date === today });
  if (!p) return Response.json({ error: 'not-found' }, { status: 404, headers: noStore });
  let user = null;
  try {
    user = (await auth())?.user || null;
  } catch {}
  const actor = actorFor(user?.id || null, sp.get('device'));
  const res = (await kv.raw().hgetall(sudokuResKey(date))) || {};
  // Bejelentkezve az ezen az eszközön vendégként beküldött megoldás is az övé.
  const devActor = user?.id ? actorFor(null, sp.get('device')) : null;
  const mineRaw = (actor && res[actor]) || (devActor && res[devActor]) || null;
  if (mineRaw && actor && !res[actor]) await kv.raw().hset(sudokuResKey(date), actor, mineRaw);
  const mine = mineRaw ? Number(mineRaw) : null;
  // A megoldók statisztikája csak annak jár, aki már megoldotta.
  const all = Object.values(res).map(Number).filter((x) => x > 0);
  const stats = mine ? { mine, avg: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null, count: all.length } : null;
  // Aki már megoldotta, megkapja a megoldást is (más eszközön is kitöltve látja a rácsot).
  return Response.json({ live: true, ...publicSudoku(p), number: sudokuNumber(date), mine, stats, ...(mine ? { solution: p.solution } : {}) }, { headers: noStore });
}
