import { kv } from './kv';
import { EMOJIS } from './community';

// Emoji-reakciók a napi titkosírásokra (a főoldalon és a korábbi titkosírásoknál), ugyanazokkal
// az emojikkal, mint a közösségi rejtvényeknél. Bárki reagálhat: bejelentkezve a fiókja, vendégként
// a böngészőben tárolt névtelen eszközazonosító (lib/device.js) alapján, napi titkosírásonként egyet.
//   daily:reactions:<YYYY-MM-DD>   "u:<uid>" | "d:<eszközazonosító>" -> emoji sorszáma
export { EMOJIS };
export const dailyReactionsKey = (date) => `daily:reactions:${date}`;

export function actorFor(sessionUserId, device) {
  if (sessionUserId) return `u:${sessionUserId}`;
  if (/^[a-f0-9]{32}$/.test(String(device || ''))) return `d:${device}`;
  return null;
}

export async function reactionSummary(date, actor) {
  const all = (await kv.raw().hgetall(dailyReactionsKey(date))) || {};
  const counts = EMOJIS.map(() => 0);
  for (const v of Object.values(all)) {
    const k = Number(v);
    if (Number.isInteger(k) && k >= 0 && k < EMOJIS.length) counts[k] += 1;
  }
  const mineRaw = actor ? all[actor] : undefined;
  const mine = mineRaw != null && Number.isInteger(Number(mineRaw)) ? Number(mineRaw) : null;
  return { emojis: EMOJIS, reactions: counts, mine };
}
