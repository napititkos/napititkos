export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';

export async function POST(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const history = (await kv.get('rotation:history')) || [];
  const seenIds = new Set();
  const cleaned = [];
  let removedEmpty = 0;
  let removedDuplicate = 0;

  for (const item of history) {
    if (!item.clue?.trim() || !item.answer?.trim()) {
      removedEmpty++;
      continue;
    }
    if (seenIds.has(item.id)) {
      removedDuplicate++;
      continue;
    }
    seenIds.add(item.id);
    cleaned.push(item);
  }

  await kv.set('rotation:history', cleaned);

  return Response.json({
    ok: true,
    before: history.length,
    after: cleaned.length,
    removedEmpty,
    removedDuplicate,
  });
}
