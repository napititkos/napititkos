import crypto from 'crypto';
import { kv } from './kv';

// Személyes (csak egy felhasználónak szóló) értesítések, e-mail-cím szerint tárolva.
// A mindenkinek szóló, admin által kiírt értesítések továbbra is a notifications:list-ben vannak.
const MAX_ITEMS = 30;
const TTL_SECONDS = 180 * 24 * 3600;

function key(email) {
  return `notifications:user:${String(email).toLowerCase().trim()}`;
}

export async function pushUserNotification(email, { text, href = '' }) {
  if (!email) return false;
  try {
    const list = (await kv.get(key(email))) || [];
    list.unshift({ id: crypto.randomUUID(), text: String(text).slice(0, 500), href: String(href).slice(0, 200), ts: Date.now() });
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

// Elutasított beküldések indoklással (csak akkor tároljuk, ha az admin írt indoklást).
// A beküldő a Profilomban látja; fióktörléskor törlődik, az adatexportban benne van.
const REJ_MAX = 30;
function rejKey(email) {
  return `rejections:user:${String(email).toLowerCase().trim()}`;
}
export async function pushRejection(email, item) {
  if (!email) return false;
  try {
    const list = (await kv.get(rejKey(email))) || [];
    list.unshift({ id: crypto.randomUUID(), ...item });
    await kv.set(rejKey(email), list.slice(0, REJ_MAX), TTL_SECONDS * 2);
    return true;
  } catch (err) {
    console.error('Elutasítás mentési hiba:', err.message);
    return false;
  }
}
export async function userRejections(email) {
  if (!email) return [];
  return ((await kv.get(rejKey(email))) || []).slice(0, REJ_MAX);
}
