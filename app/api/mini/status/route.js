export const dynamic = 'force-dynamic';

import { currentMini, miniLive } from '../../../../lib/mini';

// Könnyű állapotlekérés a főoldali gombhoz: él-e a mini, és melyik a hét.
export async function GET() {
  if (!miniLive()) return Response.json({ live: false }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  const cur = await currentMini();
  return Response.json({ live: !!cur, week: cur?.week || null }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
}
