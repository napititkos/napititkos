export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { dayIndexFor, todayStr } from '../../../lib/date';

export async function GET() {
  const puzzles = (await kv.get('puzzles:list')) || [];
  if (!puzzles.length) {
    return Response.json({ error: 'no-puzzles' }, { status: 404 });
  }
  const idx = dayIndexFor(puzzles.length);
  const puzzle = puzzles[idx];
  return Response.json({ puzzle, index: idx, total: puzzles.length, date: todayStr() });
}
