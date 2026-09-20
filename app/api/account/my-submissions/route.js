export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const puzzles = (await kv.get('puzzles:list')) || [];
  const mine = puzzles.filter((p) => p.submittedByEmail === session.user.email);

  const history = (await kv.get('rotation:history')) || [];
  const shownDateById = {};
  history.forEach((h) => {
    shownDateById[h.id] = h.shownDate;
  });

  const result = mine.map((p) => ({
    id: p.id,
    clue: p.clue,
    answer: p.answer,
    shownDate: shownDateById[p.id] || null,
  }));

  return Response.json({ submissions: result });
}
