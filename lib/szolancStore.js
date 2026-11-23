// Szólánc: a napok feladványai. Az admin kézzel válogathat (beemelés egy jövőbeli napra); ha egy
// napra nincs beemelt feladvány, a dátumból generált (generateSzolanc) érvényes.
//   szolanc:sched   nap -> { start, end, level, par, paths, pickedAt }
import { kv } from './kv';
import { generateSzolanc, ladderInfo, levelOf, szolancLevel, szolancNumber } from './szolanc';

export const SZOLANC_SCHED_KEY = 'szolanc:sched';

export async function szolancSchedule() {
  const all = (await kv.raw().hgetall(SZOLANC_SCHED_KEY)) || {};
  const out = {};
  for (const [d, v] of Object.entries(all)) {
    try {
      out[d] = JSON.parse(v);
    } catch {}
  }
  return out;
}

export async function szolancForDate(date) {
  let picked = null;
  try {
    picked = JSON.parse((await kv.raw().hget(SZOLANC_SCHED_KEY, date)) || 'null');
  } catch {}
  if (picked?.start && picked?.end) return { date, number: szolancNumber(date), level: picked.level, start: picked.start, end: picked.end, par: picked.par, paths: picked.paths, picked: true };
  return generateSzolanc(date);
}

// Beemelés egy napra: a feladvány adatait a szerver újraszámolja (lépések, utak, nehézség).
export async function pickSzolanc(date, start, end) {
  const info = ladderInfo(start, end);
  const level = levelOf(info.d, info.paths);
  if (!level) return null;
  const v = { start, end, level, par: info.d, paths: info.paths, pickedAt: new Date().toISOString() };
  await kv.raw().hset(SZOLANC_SCHED_KEY, date, JSON.stringify(v));
  return v;
}
export async function unpickSzolanc(date) {
  await kv.raw().hdel(SZOLANC_SCHED_KEY, date);
}
export { szolancLevel };
