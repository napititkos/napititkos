export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { isValidDateStr, todayStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { renderComboCard } from '../../../../lib/socialCard';
import { comboFor } from '../../../../lib/social';

// A szókereső + szólánc poszt képe: /api/social/combo-card?d=YYYY-MM-DD&t=light|dark. Csak a mai
// vagy korábbi napra (jövőbeli feladvány nem szivároghat ki).
export async function GET(req) {
  if (await isLimited('social-card:ip', clientIp(req), 60, 60)) return tooMany(60);
  const url = new URL(req.url);
  const date = url.searchParams.get('d') || '';
  const theme = url.searchParams.get('t') === 'dark' ? 'dark' : 'light';
  if (!isValidDateStr(date)) return Response.json({ error: 'invalid-date' }, { status: 400 });
  if (date > todayStr()) return Response.json({ error: 'not-found' }, { status: 404 });
  const c = await comboFor(date);
  if (!c) return Response.json({ error: 'not-found' }, { status: 404 });
  const png = Buffer.from(await renderComboCard({ theme, date, ...c }).arrayBuffer());
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
}
