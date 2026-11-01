export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import sharp from 'sharp';
import { kv } from '../../../../lib/kv';
import { isValidDateStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { renderSocialCard, themeForDay } from '../../../../lib/socialCard';
import { socialEntryFor } from '../../../../lib/social';

// A közösségi posztok képe: /api/social/card?d=YYYY-MM-DD&f=fb|ig[&v=...]. Csak már megjelent
// (az előzményben szereplő) titkosításhoz ad képet, így jövőbeli rejtvény nem szivároghat ki; a
// megfejtés nem kerül a képre. A rejtvény szövegét mindig az aktuális (élő) változatból vesszük,
// így a posztolás előtti admin-módosítások is megjelennek; a "v" paraméter (a tartalom
// lenyomata) csak a gyorsítótárakat választja szét. A Facebook PNG-t, az Instagram csak JPEG-et fogad el.
export async function GET(req) {
  if (await isLimited('social-card:ip', clientIp(req), 60, 60)) return tooMany(60);
  const url = new URL(req.url);
  const date = url.searchParams.get('d') || '';
  const format = url.searchParams.get('f') === 'ig' ? 'ig' : 'fb';
  if (!isValidDateStr(date)) return Response.json({ error: 'invalid-date' }, { status: 400 });

  const found = await socialEntryFor(date);
  if (!found) return Response.json({ error: 'not-found' }, { status: 404 });

  const image = renderSocialCard({ entry: found.entry, format, dayNumber: found.dayNumber, theme: themeForDay(found.dayNumber) });
  const png = Buffer.from(await image.arrayBuffer());
  const body = format === 'ig' ? await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer() : png;
  return new Response(body, {
    headers: {
      'Content-Type': format === 'ig' ? 'image/jpeg' : 'image/png',
      // Rövid gyorsítótár: egy későbbi javítás (új "v") úgyis új címet kap.
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
