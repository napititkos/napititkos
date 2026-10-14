export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { EMOJIS, communityList, deleteCommunityData, deleteCommunityNotifications, ratingsKey, reactionsKey, solvedKey, summaries, toPlayable } from '../../../../lib/community';
import { isAdminRequest } from '../../../../lib/adminAuth';

// Egy közösségi titkosírás lejátszáshoz (a megoldással együtt, ahogy a napi rejtvénynél is),
// az értékelés és a reakciók összesítésével, és a bejelentkezett felhasználó saját állapotával.
export async function GET(req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const s = (await communityList()).find((x) => x.id === id);
  if (!s) return Response.json({ error: 'not-found' }, { status: 404 });
  const uid = session.user.id;
  let mine = { solved: false, stars: null, reaction: null };
  if (uid) {
    const r = kv.raw();
    const [solved, stars, reaction] = await Promise.all([r.hget(solvedKey(id), uid), r.hget(ratingsKey(id), uid), r.hget(reactionsKey(id), uid)]);
    mine = { solved: !!solved, stars: stars ? Number(stars) : null, reaction: reaction != null ? Number(reaction) : null };
  }
  const sum = (await summaries([id]))[id];
  return Response.json(
    {
      puzzle: { ...toPlayable(s), submittedBy: s.name && s.name !== 'Névtelen' ? s.name : '', createdAt: s.createdAt, promoted: !!s.promotedAt },
      avg: sum.avg,
      ratingCount: sum.ratingCount,
      reactions: sum.reactions,
      emojis: EMOJIS,
      mine,
      canRate: !!(uid && session.user.verified),
      isOwner: String(s.submitterEmail || '').toLowerCase() === String(session.user.email || '').toLowerCase(),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

// Törlés: a beküldő a sajátját, az admin bármelyiket (admin munkamenettel). Az értékelések,
// reakciók és megfejtések is törlődnek.
export async function DELETE(req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const s = (await communityList()).find((x) => x.id === id);
  if (!s) return Response.json({ error: 'not-found' }, { status: 404 });
  const isOwner = String(s.submitterEmail || '').toLowerCase() === String(session.user.email || '').toLowerCase();
  if (!isOwner && !(await isAdminRequest(req))) return Response.json({ error: 'forbidden' }, { status: 403 });
  const locked = await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    await kv.set('submissions:list', list.filter((x) => x.id !== id));
    return true;
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  await deleteCommunityData(id);
  if (s.submitterEmail) await deleteCommunityNotifications(s.submitterEmail, id);
  return Response.json({ ok: true });
}
