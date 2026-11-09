export const dynamic = 'force-dynamic';

import { auth } from '../../../auth';
import { currentMini, miniLive, miniStats, weekStart } from '../../../lib/mini';
import { actorFor } from '../../../lib/reactions';

// A heti mini keresztrejtvény (csak élesítés után): rács, kérdések, a hét, statisztika.
// GET ?device=<eszközazonosító>
export async function GET(req) {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!miniLive()) return Response.json({ live: false }, { headers: noStore });
  const cur = await currentMini();
  if (!cur) return Response.json({ live: true, puzzle: null, week: weekStart() }, { headers: noStore });
  let uid = null;
  try {
    uid = (await auth())?.user?.id || null;
  } catch {}
  const actor = actorFor(uid, new URL(req.url).searchParams.get('device'));
  const stats = await miniStats(cur.week, actor);
  return Response.json(
    {
      live: true,
      week: cur.week,
      puzzle: { id: cur.id, rows: cur.rows, entries: cur.entries.map(({ dir, row, col, len, word, clue }) => ({ dir, row, col, len, word, clue })) },
      stats,
    },
    { headers: noStore }
  );
}
