export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { communityList, toPlayable } from '../../../../lib/community';
import { readJson } from '../../../../lib/validate';
import { pushUserNotification, shortClue } from '../../../../lib/userNotifications';

// Közösségi titkosírás beemelése a fő (napi) listába: másolat kerül a sor végére, a közösségi
// rejtvény is megmarad (beemeltként jelölve). A beküldő értesítést kap.
export async function POST(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await readJson(req, 2000)) || {};
  const id = typeof body.id === 'string' ? body.id.slice(0, 100) : '';
  const s = (await communityList()).find((x) => x.id === id);
  if (!s) return Response.json({ error: 'not-found' }, { status: 404 });
  if (s.promotedAt) return Response.json({ error: 'already', message: 'Ez a titkosírás már bekerült a fő listába.' }, { status: 409 });

  const copy = {
    ...toPlayable(s),
    id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    parHints: 3,
    scheduledDate: '',
    submittedBy: s.name && s.name !== 'Névtelen' ? s.name : '',
    submittedByEmail: s.submitterEmail || '',
    fromCommunity: s.id,
  };
  const locked = await kv.withLock('puzzles-save', async () => {
    const list = (await kv.get('puzzles:list')) || [];
    list.push(copy);
    await kv.set('puzzles:list', list);
    return true;
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    const it = list.find((x) => x.id === id);
    if (it) {
      it.promotedAt = new Date().toISOString();
      it.promotedPuzzleId = copy.id;
      await kv.set('submissions:list', list);
    }
    return true;
  });
  let notified = false;
  if (s.submitterEmail) {
    notified = await pushUserNotification(s.submitterEmail, {
      ref: { type: 'accepted', puzzleId: copy.id },
      text: `Elfogadtuk a beküldött titkosírásodat („${shortClue(s.clue)}”)! Bekerült a napi titkosírások közé, hamarosan sorra kerül.`,
      href: '/account',
    });
  }
  return Response.json({ ok: true, puzzleId: copy.id, notified });
}
