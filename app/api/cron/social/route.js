export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { GET as getPuzzle } from '../../puzzle/route';
import { getSiteUrl } from '../../../../lib/siteUrl';
import { cronAuthorized, runSocialPost } from '../../../../lib/social';

// A napi közösségi poszt (Vercel Cron, vercel.json). A mai rejtvényt a /api/puzzle saját
// kezelőjén keresztül kérjük le, így ha reggel még senki nem nyitotta meg az oldalt, a napi
// váltás is ugyanazzal a logikával (zár alatt) megtörténik.
export async function GET(req) {
  if (!process.env.CRON_SECRET) return Response.json({ error: 'not-configured' }, { status: 503 });
  if (!cronAuthorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const siteUrl = getSiteUrl();
  const res = await getPuzzle(new Request(`${siteUrl}/api/puzzle`, { headers: { 'x-real-ip': 'cron-social' } }));
  if (!res.ok) return Response.json({ error: 'puzzle-unavailable' }, { status: 502 });
  const { puzzle, date } = await res.json();

  const pollMs = Number(process.env.SOCIAL_POLL_MS) || undefined;
  const result = await runSocialPost({ date, clue: puzzle.clue, answer: puzzle.answer, siteUrl, pollMs });
  const failed = [result.fb, result.ig].some((r) => r?.status === 'error');
  return Response.json(result, { status: failed ? 500 : 200, headers: { 'Cache-Control': 'no-store' } });
}
