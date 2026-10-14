import crypto from 'crypto';
import { kv } from './kv';

// Személyes (csak egy felhasználónak szóló) értesítések, e-mail-cím szerint tárolva.
// A mindenkinek szóló, admin által kiírt értesítések továbbra is a notifications:list-ben vannak.
const MAX_ITEMS = 30;
const TTL_SECONDS = 180 * 24 * 3600;

function key(email) {
  return `notifications:user:${String(email).toLowerCase().trim()}`;
}

// ref: belső hivatkozás (pl. { type: 'accepted', puzzleId }), hogy az értesítés később
// visszavonható legyen (pl. ha az elfogadott rejtvényt törlik). A felhasználó nem látja.
export async function pushUserNotification(email, { text, href = '', ref = null }) {
  if (!email) return false;
  try {
    const list = (await kv.get(key(email))) || [];
    const item = { id: crypto.randomUUID(), text: String(text).slice(0, 500), href: String(href).slice(0, 200), ts: Date.now() };
    if (ref) item.ref = ref;
    list.unshift(item);
    await kv.set(key(email), list.slice(0, MAX_ITEMS), TTL_SECONDS);
    return true;
  } catch (err) {
    console.error('Személyes értesítés hiba:', err.message);
    return false;
  }
}

export async function userNotifications(email) {
  if (!email) return [];
  return ((await kv.get(key(email))) || []).slice(0, MAX_ITEMS);
}

// Értesítések visszavonása (pl. az elfogadott, majd törölt rejtvényé). A predikátum az egyes
// értesítéseket kapja; amelyikre igazat ad, az törlődik. Visszaadja a törölt darabszámot.
export async function removeUserNotifications(email, predicate) {
  if (!email) return 0;
  try {
    const list = (await kv.get(key(email))) || [];
    const kept = list.filter((n) => !predicate(n));
    if (kept.length !== list.length) await kv.set(key(email), kept, TTL_SECONDS);
    return list.length - kept.length;
  } catch (err) {
    console.error('Értesítés-visszavonási hiba:', err.message);
    return 0;
  }
}

// Az elfogadásról szóló értesítés rövidített rejtvényszövege (a küldésnél és a visszavonásnál
// ugyanígy kell képezni, hogy a hivatkozás nélküli, régebbi értesítés is megtalálható legyen).
export function shortClue(clue) {
  const c = String(clue || '');
  return c.length > 60 ? `${c.slice(0, 57)}…` : c;
}
