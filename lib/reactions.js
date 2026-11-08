import { kv } from './kv';
import { PRESET_EMOJIS, normalizeReaction, tallyReactions } from './emojis';
import { ALLOWED_EMOJIS } from './emojiAllowed';

// Emoji-reakciók a napi titkosírásokra (a főoldalon és a korábbi titkosírásoknál). Bárki
// reagálhat: bejelentkezve a fiókja, vendégként a böngészőben tárolt névtelen eszközazonosító
// (lib/device.js) alapján, napi titkosírásonként egyet. Az alap-emojik mellett a teljes
// készletből is lehet választani (a + gombbal).
//   daily:reactions:<YYYY-MM-DD>   "u:<uid>" | "d:<eszközazonosító>" -> emoji (régen: sorszám)
export const dailyReactionsKey = (date) => `daily:reactions:${date}`;

export function actorFor(sessionUserId, device) {
  if (sessionUserId) return `u:${sessionUserId}`;
  if (/^[a-f0-9]{32}$/.test(String(device || ''))) return `d:${device}`;
  return null;
}

// Beküldött reakció ellenőrzése: emoji karakter (alap vagy a teljes készletből), régi kliensnél
// sorszám is lehet. Visszaadja az emojit, vagy undefined-et, ha érvénytelen.
export function parseReaction(input) {
  if (input === null) return null;
  const e = typeof input === 'number' && Number.isInteger(input) ? normalizeReaction(input) : typeof input === 'string' ? input : null;
  if (e && (PRESET_EMOJIS.includes(e) || ALLOWED_EMOJIS.has(e))) return e;
  return undefined;
}

export async function reactionSummary(date, actor) {
  const all = (await kv.raw().hgetall(dailyReactionsKey(date))) || {};
  const { counts, mine } = tallyReactions(all, actor);
  return { presets: PRESET_EMOJIS, counts, mine };
}
