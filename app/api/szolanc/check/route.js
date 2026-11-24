export const dynamic = 'force-dynamic';

import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { isWord } from '../../../../lib/szolancServer';

// Egy szó ellenőrzése a szótárban (az 5 betűs Szóláncnál: a nagy lista csak a szerveren van).
export async function GET(req) {
  if (await isLimited('szolanc:check:ip', clientIp(req), 1200, 3600)) return tooMany(3600);
  const w = String(new URL(req.url).searchParams.get('w') || '').toLowerCase().slice(0, 8);
  return Response.json({ ok: isWord(w) }, { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } });
}
