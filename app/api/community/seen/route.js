export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { communityList, seenKey } from '../../../../lib/community';

// Az "Új!" jelzés bejelentkezett felhasználónál a szerveren tárolja, meddig látta már a közösségi
// titkosírásokat (így kijelentkezés / másik eszköz után sem jelenik meg újra feleslegesen).
// GET: { seenAt, latestAt } - POST: a mostani legfrissebbig látottnak jelöli.
async function latest() {
  return (await communityList()).reduce((mx, s) => Math.max(mx, Date.parse(s.createdAt) || 0), 0);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const seenAt = Number(await kv.raw().get(seenKey(session.user.id))) || 0;
  return Response.json({ seenAt, latestAt: await latest() }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const l = await latest();
  const r = kv.raw();
  const prev = Number(await r.get(seenKey(session.user.id))) || 0;
  if (l > prev) await r.set(seenKey(session.user.id), String(l));
  return Response.json({ ok: true, seenAt: Math.max(l, prev) });
}
