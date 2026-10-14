export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { communityList, summaries } from '../../../../lib/community';

// A bejelentkezett felhasználó saját közösségi titkosírásai (a Profilom oldalra): értékeléssel,
// reakciószámmal, és hogy bekerült-e a napi titkosírások közé (ha igen, mikor jelent meg).
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const email = String(session.user.email).toLowerCase();
  const mine = (await communityList()).filter((s) => String(s.submitterEmail || '').toLowerCase() === email);
  const sums = await summaries(mine.map((s) => s.id));
  const history = (await kv.get('rotation:history')) || [];
  const shownDateById = {};
  history.forEach((h) => {
    shownDateById[h.id] = h.shownDate;
  });
  const result = mine
    .map((s) => ({
      id: s.id,
      clue: s.clue,
      answer: s.answer,
      createdAt: s.createdAt,
      avg: sums[s.id]?.avg ?? null,
      ratingCount: sums[s.id]?.ratingCount || 0,
      reactionCount: (sums[s.id]?.reactions || []).reduce((a, b) => a + b, 0),
      promoted: !!s.promotedAt,
      shownDate: s.promotedPuzzleId ? shownDateById[s.promotedPuzzleId] || null : null,
    }))
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  return Response.json({ submissions: result }, { headers: { 'Cache-Control': 'private, no-store' } });
}
