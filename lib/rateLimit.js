import { kv } from './kv';

// Vercelen a platform állítja be ezeket a fejléceket, a kliens nem tudja
// felülírni. Ismeretlen címnél közös "unknown" vödörbe kerül a kérés.
export function clientIp(req) {
  const h = req?.headers;
  if (!h) return 'unknown';
  return (
    h.get('x-vercel-forwarded-for') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

// Rögzített ablakú számláló Redisben. Igaz, ha az ablakon belüli kérések száma
// meghaladja a korlátot. Redis-hiba esetén NEM blokkolunk (fail-open), hogy egy
// adatbázis-kiesés ne ejtse ki a játékot; a kritikus admin belépés külön, zártan kezelt.
export async function isLimited(scope, id, limit, windowSeconds) {
  try {
    const n = await kv.incr(`rl:${scope}:${id}`, windowSeconds);
    return n > limit;
  } catch (err) {
    console.error('Rate limit hiba:', err.message);
    return false;
  }
}

// Csak sikertelen próbálkozásokat számláló változat (pl. jelszó-találgatás).
export async function failures(scope, id) {
  try {
    return Number(await kv.get(`rl:${scope}:${id}`)) || 0;
  } catch {
    return 0;
  }
}
export async function recordFailure(scope, id, windowSeconds) {
  try {
    await kv.incr(`rl:${scope}:${id}`, windowSeconds);
  } catch (err) {
    console.error('Rate limit hiba:', err.message);
  }
}
export async function clearFailures(scope, id) {
  try {
    await kv.del(`rl:${scope}:${id}`);
  } catch {}
}

// Várakozási idő két művelet között (pl. két beküldés vagy komment között). Ha az előző óta
// még nem telt le az idő, a hátralévő másodperceket adja vissza; különben atomikusan (SET NX)
// lefoglalja a következő ablakot és 0-t ad - így párhuzamos kérésekből is csak egy jut át.
// Redis-hiba esetén nem blokkol (fail-open), mint az isLimited.
export async function cooldown(scope, id, seconds) {
  const key = `rl:cd:${scope}:${id}`;
  try {
    if (await kv.setIfAbsent(key, Date.now(), seconds)) return 0;
    const ttl = await kv.raw().ttl(key);
    return ttl > 0 ? ttl : seconds;
  } catch (err) {
    console.error('Rate limit hiba:', err.message);
    return 0;
  }
}
// A lefoglalt várakozási ablak visszaadása (ha a művelet végül nem sikerült).
export async function releaseCooldown(scope, id) {
  try {
    await kv.del(`rl:cd:${scope}:${id}`);
  } catch {}
}
// A hátralévő idő olvasható formában: "45 mp", "1 perc 30 mp", "2 perc".
export function waitText(seconds) {
  const s = Math.max(1, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} mp`;
  return r ? `${m} perc ${r} mp` : `${m} perc`;
}
// 429-es válasz a hátralévő várakozási idővel (a felület ebből ír üzenetet).
export function waitResponse(seconds, message) {
  return Response.json(
    { ok: false, error: 'cooldown', retryAfter: seconds, message },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  );
}

export function tooMany(windowSeconds = 60) {
  return Response.json(
    { ok: false, error: 'Túl sok kérés. Próbáld újra később.' },
    { status: 429, headers: { 'Retry-After': String(windowSeconds) } }
  );
}
