export const dynamic = 'force-dynamic';

import { kv } from '../../../../../lib/kv';
import { auth } from '../../../../../auth';
import { communityList, normAnswer, solvedKey } from '../../../../../lib/community';
import { isLimited, tooMany } from '../../../../../lib/rateLimit';
import { readJson } from '../../../../../lib/validate';

// A megfejtés rögzítése (bejelentkezett, megerősített fióknak): ez nyitja meg az értékelést.
export async function POST(req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  if (!session.user.verified) return Response.json({ error: 'unverified' }, { status: 403 });
  if (await isLimited('community:solve', session.user.id, 120, 3600)) return tooMany(3600);
  const body = (await readJson(req, 2000)) || {};
  const s = (await communityList()).find((x) => x.id === id);
  if (!s) return Response.json({ error: 'not-found' }, { status: 404 });
  if (normAnswer(body.answer) !== normAnswer(s.answer)) return Response.json({ error: 'wrong' }, { status: 400 });
  await kv.raw().hsetnx(solvedKey(id), session.user.id, String(Date.now()));
  return Response.json({ ok: true });
}
