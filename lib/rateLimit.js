// Vercelen a platform állítja be ezeket a fejléceket, a kliens nem tudja
// felülírni. Ismeretlen címnél közös "unknown" vödörbe kerül a kérés.
export function clientIp(req) {
  const h = req.headers;
  return (
    h.get('x-vercel-forwarded-for') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}
