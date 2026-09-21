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

export function tooMany(windowSeconds = 60) {
  return Response.json(
    { ok: false, error: 'Túl sok kérés. Próbáld újra később.' },
    { status: 429, headers: { 'Retry-After': String(windowSeconds) } }
  );
}
