export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { communityList, solvedKey } from '../../../../lib/community';

// A szerveren nyilvántartott, trófeákhoz szükséges tények a bejelentkezett felhasználóról
// (utólagos ellenőrzéshez is): fejtett-e már meg közösségi rejtvényt, és bekerült-e a napi
// titkosírások közé (már megjelent) egy általa beküldött rejtvény.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({}, { headers: { 'Cache-Control': 'private, no-store' } });
  const uid = session.user.id;
  const email = String(session.user.email || '').toLowerCase();
  const list = await communityList();
  let communitySolved = false;
  if (list.length) {
    const p = kv.raw().pipeline();
    for (const s of list) p.hget(solvedKey(s.id), uid);
    const res = await p.exec();
    communitySolved = res.some((x) => x?.[1]);
  }
  const myPromoted = new Set(list.filter((s) => String(s.submitterEmail || '').toLowerCase() === email && s.promotedPuzzleId).map((s) => s.promotedPuzzleId));
  const history = (await kv.get('rotation:history')) || [];
  const bigLeagues = history.some((h) => h && (myPromoted.has(h.id) || (email && String(h.submittedByEmail || '').toLowerCase() === email)));
  return Response.json({ communitySolved, bigLeagues }, { headers: { 'Cache-Control': 'private, no-store' } });
}
