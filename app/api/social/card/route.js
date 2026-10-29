export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import sharp from 'sharp';
import { kv } from '../../../../lib/kv';
import { isValidDateStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { renderSocialCard } from '../../../../lib/socialCard';

// A közösségi posztok képe: /api/social/card?d=YYYY-MM-DD&f=fb|ig. Csak már megjelent (az
// előzményben szereplő) titkosításhoz ad képet, így jövőbeli rejtvény nem szivároghat ki; a
// megfejtés nem kerül a képre. A Facebook PNG-t, az Instagram (API) csak JPEG-et fogad el.
export async function GET(req) {
  if (await isLimited('social-card:ip', clientIp(req), 60, 60)) return tooMany(60);
  const url = new URL(req.url);
  const date = url.searchParams.get('d') || '';
  const format = url.searchParams.get('f') === 'ig' ? 'ig' : 'fb';
  if (!isValidDateStr(date)) return Response.json({ error: 'invalid-date' }, { status: 400 });

  const history = (await kv.get('rotation:history')) || [];
  // Ha egy napon belül (admin beütemezéssel) csere történt, az utolsó, vagyis az aktuális számít.
  const index = history.findLastIndex((h) => h.shownDate === date);
  if (index < 0) return Response.json({ error: 'not-found' }, { status: 404 });

  const image = renderSocialCard({ entry: history[index], format, dayNumber: index + 1 });
  const png = Buffer.from(await image.arrayBuffer());
  const body = format === 'ig' ? await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer() : png;
  return new Response(body, {
    headers: {
      'Content-Type': format === 'ig' ? 'image/jpeg' : 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
