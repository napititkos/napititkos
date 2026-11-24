export const dynamic = 'force-dynamic';

import { currentMini, miniLeaderboard } from '../../../../lib/mini';

// A heti mini idő szerinti ranglistája (a gyorsabb elöl), hetente új.
// A ranglista nem kerülhet a CDN gyorsítótárába: különben a megfejtés után (akár 20 mp-ig) a
// régi lista jönne, és a játékos nem látná magát rajta (a felúszás sem indulna el).
export async function GET() {
  const cur = await currentMini();
  if (!cur) return Response.json({ live: false, entries: [] }, { headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ live: true, week: cur.week, entries: await miniLeaderboard(cur.week) }, { headers: { 'Cache-Control': 'no-store' } });
}
