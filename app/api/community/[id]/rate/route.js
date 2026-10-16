export const dynamic = 'force-dynamic';

import { kv } from '../../../../../lib/kv';
import { auth } from '../../../../../auth';
import { EMOJIS, communityList, notifiedKey, ratingsKey, reactionsKey, solvedKey, summaries } from '../../../../../lib/community';
import { isLimited, tooMany } from '../../../../../lib/rateLimit';
import { readJson } from '../../../../../lib/validate';
import { pushUserNotification, shortClue } from '../../../../../lib/userNotifications';

// Értékelés (stars: 1-5) és/vagy emoji-reakció (reaction: 0-9, vagy null a visszavonáshoz).
// Csak az értékelheti, aki bejelentkezve megfejtette; fiókonként egy-egy, később módosítható.
export async function POST(req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  if (!session.user.verified) return Response.json({ error: 'unverified' }, { status: 403 });
  if (await isLimited('community:rate', session.user.id, 120, 3600)) return tooMany(3600);
  const uid = session.user.id;
  const sub = (await communityList()).find((x) => x.id === id);
  if (!sub) return Response.json({ error: 'not-found' }, { status: 404 });
  const r = kv.raw();
  if (!(await r.hget(solvedKey(id), uid))) return Response.json({ error: 'not-solved', message: 'Előbb fejtsd meg a rejtvényt!' }, { status: 403 });
  const body = (await readJson(req, 1000)) || {};
  const hasStars = body.stars !== undefined;
  const hasReaction = body.reaction !== undefined;
  if (!hasStars && !hasReaction) return Response.json({ error: 'invalid-body' }, { status: 400 });
  if (hasStars && !(Number.isInteger(body.stars) && body.stars >= 1 && body.stars <= 5)) return Response.json({ error: 'invalid-stars' }, { status: 400 });
  if (hasReaction && body.reaction !== null && !(Number.isInteger(body.reaction) && body.reaction >= 0 && body.reaction < EMOJIS.length)) {
    return Response.json({ error: 'invalid-reaction' }, { status: 400 });
  }
  const [prevStars, prevReaction] = await Promise.all([r.hget(ratingsKey(id), uid), r.hget(reactionsKey(id), uid)]);
  if (hasStars) await r.hset(ratingsKey(id), uid, String(body.stars));
  if (hasReaction) {
    if (body.reaction === null) await r.hdel(reactionsKey(id), uid);
    else await r.hset(reactionsKey(id), uid, String(body.reaction));
  }
  // Személyes értesítés a beküldőnek az első értékelésről, illetve az új reakcióról (a sajátjáról
  // nem, és az értékelő neve nélkül). Az értékelés módosítása nem küld újabb értesítést.
  const ownerEmail = String(sub.submitterEmail || '');
  const isOwner = ownerEmail.toLowerCase() === String(session.user.email || '').toLowerCase();
  if (ownerEmail && !isOwner) {
    const clue = shortClue(sub.clue);
    // Fiókonként és rejtvényenként csak egyszer értesítünk az értékelésről és egyszer a
    // reakcióról: a reakció ide-oda kapcsolgatásával így nem lehet "elárasztani" a beküldőt.
    const notifyOnce = async (kind) => (await r.hsetnx(notifiedKey(id), `${uid}:${kind}`, '1')) === 1;
    if (hasStars && prevStars == null && (await notifyOnce('s'))) {
      await pushUserNotification(ownerEmail, {
        text: `Valaki ${body.stars} csillagra értékelte a titkosírásodat („${clue}”).`,
        href: '/kozossegi',
        ref: { type: 'community', id },
      });
    }
    if (hasReaction && body.reaction !== null && String(body.reaction) !== prevReaction && (await notifyOnce('r'))) {
      await pushUserNotification(ownerEmail, {
        text: `Valaki reagált a titkosírásodra („${clue}”): ${EMOJIS[body.reaction]}`,
        href: '/kozossegi',
        ref: { type: 'community', id },
      });
    }
  }
  const sum = (await summaries([id]))[id];
  return Response.json({ ok: true, avg: sum.avg, ratingCount: sum.ratingCount, reactions: sum.reactions });
}
