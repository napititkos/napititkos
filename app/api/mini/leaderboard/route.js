export const dynamic = 'force-dynamic';

import { currentMini, miniLeaderboard } from '../../../../lib/mini';

// A heti mini idő szerinti ranglistája (a gyorsabb elöl), hetente új.
export async function GET() {
  const cur = await currentMini();
  if (!cur) return Response.json({ live: false, entries: [] }, { headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ live: true, week: cur.week, entries: await miniLeaderboard(cur.week) }, { headers: { 'Cache-Control': 'public, s-maxage=20' } });
}
