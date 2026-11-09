export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import sharp from 'sharp';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { renderMiniCard } from '../../../../lib/socialCard';

// A heti mini poszt képe: /api/social/mini-card?f=fb|ig&t=light|dark (a "w" csak a gyorsítótárat választja szét).
export async function GET(req) {
  if (await isLimited('social-card:ip', clientIp(req), 60, 60)) return tooMany(60);
  const url = new URL(req.url);
  const format = url.searchParams.get('f') === 'ig' ? 'ig' : 'fb';
  const theme = url.searchParams.get('t') === 'light' ? 'light' : 'dark';
  const png = Buffer.from(await renderMiniCard({ format, theme }).arrayBuffer());
  const body = format === 'ig' ? await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer() : png;
  return new Response(body, { headers: { 'Content-Type': format === 'ig' ? 'image/jpeg' : 'image/png', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
}
