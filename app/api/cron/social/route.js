export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { GET as getPuzzle } from '../../puzzle/route';
import { getSiteUrl } from '../../../../lib/siteUrl';
import { cronAuthorized, runMiniPost, runSocialPost } from '../../../../lib/social';
import { kv } from '../../../../lib/kv';
import { MINI_KEYS, currentMini } from '../../../../lib/mini';
import { deleteLegacyComments } from '../../../../lib/maintenance';

// A napi közösségi poszt (Vercel Cron, vercel.json), utána az esetleges egyszeri karbantartás.
// A mai rejtvényt a /api/puzzle saját kezelőjén keresztül kérjük le, így ha reggel még senki nem
// nyitotta meg az oldalt, a napi váltás (és egy mára beütemezett rejtvény átvétele) is ugyanazzal
// a logikával, zár alatt megtörténik.
export async function GET(req) {
  if (!process.env.CRON_SECRET) return Response.json({ error: 'not-configured' }, { status: 503 });
  if (!cronAuthorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const siteUrl = getSiteUrl();
  const res = await getPuzzle(new Request(`${siteUrl}/api/puzzle`, { headers: { 'x-real-ip': 'cron-social' } }));
  if (!res.ok) return Response.json({ error: 'puzzle-unavailable' }, { status: 502 });
  const { date } = await res.json();

  const pollMs = Number(process.env.SOCIAL_POLL_MS) || undefined;
  // Két futás naponta (vercel.json): délelőtt (?slot=am) az első facebookos poszt, az Instagram és a
  // heti mini; délután négykor (?slot=pm) a második facebookos poszt. Paraméter nélkül: minden.
  const q = new URL(req.url).searchParams.get('slot');
  const slot = q === 'am' || q === 'pm' ? q : 'all';
  const result = await runSocialPost({ date, siteUrl, pollMs, slot });
  if (slot === 'pm') {
    const failedPm = result.fb?.status === 'error' || result.fbCombo?.status === 'error' || !!result.error;
    return Response.json(result, { status: failedPm ? 500 : 200 });
  }
  // A heti mini keresztrejtvény posztja (élesítés után, hetente egyszer: a hét első futásakor).
  try {
    const cur = await currentMini();
    if (cur) {
      const published = (await kv.get(MINI_KEYS.published)) || [];
      result.mini = await runMiniPost({ week: cur.week, weekIndex: published.length, siteUrl, pollMs });
    }
  } catch (err) {
    console.error('Mini poszt hiba:', err.message);
    result.mini = { error: err.message };
  }
  // Egyszeri karbantartás (a megszűnt kommentek törlése); a posztolástól független.
  try {
    result.maintenance = { legacyComments: await deleteLegacyComments() };
  } catch (err) {
    console.error('Karbantartási hiba (kommentek törlése):', err.message);
    result.maintenance = { legacyComments: { error: err.message } };
  }
  const failed = [result.fb, result.fbCombo, result.ig, result.mini?.fb, result.mini?.ig].some((r) => r?.status === 'error') || !!result.error;
  return Response.json(result, { status: failed ? 500 : 200, headers: { 'Cache-Control': 'no-store' } });
}
