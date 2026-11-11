export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { todayStr, isValidDateStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { cleanName, readJson } from '../../../../lib/validate';
import { miniLive } from '../../../../lib/mini';
import { actorFor } from '../../../../lib/reactions';
import { SUDOKU_LB_TTL, sudokuForDate, sudokuLbKey, sudokuLbNamesKey, sudokuResKey } from '../../../../lib/sudoku';

// Megoldás beküldése: { date, grid[36], elapsed, device, name? }. A szerver ellenőrzi, hogy a rács
// pontosan a megoldás. Szereplőnként az első helyes megoldás ideje számít; a ranglistára csak a
// mai nap kerül fel. Válasz: a statisztika (saját idő, átlag, megoldók száma).
export async function POST(req) {
  if (await isLimited('sudoku:solve:ip', clientIp(req), 120, 3600)) return tooMany(3600);
  if (!miniLive()) return Response.json({ error: 'not-live' }, { status: 404 });
  const body = (await readJson(req, 4000)) || {};
  const date = String(body.date || '');
  const today = todayStr();
  if (!isValidDateStr(date) || date > today) return Response.json({ error: 'not-found' }, { status: 404 });
  const p = await sudokuForDate(date, { create: false });
  if (!p) return Response.json({ error: 'not-found' }, { status: 404 });
  const grid = Array.isArray(body.grid) ? body.grid.map((x) => Number(x) || 0) : [];
  if (grid.length !== 36 || grid.some((x, i) => x !== p.solution[i])) return Response.json({ error: 'wrong', message: 'Ez még nem a megoldás.' }, { status: 400 });
  let user = null;
  try {
    user = (await auth())?.user || null;
  } catch {}
  const actor = actorFor(user?.id || null, body.device);
  if (!actor) return Response.json({ error: 'invalid-device' }, { status: 400 });
  const elapsed = Math.max(3000, Math.min(24 * 3600 * 1000, Math.round(Number(body.elapsed) || 0)));
  const r = kv.raw();
  const first = await r.hsetnx(sudokuResKey(date), actor, String(elapsed));
  if (first && date === today) {
    await r.hset(sudokuLbKey(date), actor, String(elapsed));
    await r.hset(sudokuLbNamesKey(date), actor, cleanName(user?.name || body.name || ''));
    await r.expire(sudokuLbKey(date), SUDOKU_LB_TTL);
    await r.expire(sudokuLbNamesKey(date), SUDOKU_LB_TTL);
  }
  const all = Object.values((await r.hgetall(sudokuResKey(date))) || {}).map(Number).filter((x) => x > 0);
  const mine = Number(await r.hget(sudokuResKey(date), actor));
  return Response.json({ ok: true, stats: { mine, avg: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null, count: all.length } });
}
