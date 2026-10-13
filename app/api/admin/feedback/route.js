export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { adminUser, isAdminRequest } from '../../../../lib/adminAuth';
import { readJson, sanitizeFeedbackItems } from '../../../../lib/validate';
import { pushUserNotification } from '../../../../lib/userNotifications';

// Beküldött rejtvény elfogadása visszajelzéssel. Az admin felület előbb elmenti a sor végére
// került rejtvényt, majd ezzel hozzáteszi a komponensenkénti visszajelzést. A visszajelző neve
// a szerveren, a bejelentkezett admin fiókjából kerül bele (a kliens nem adhatja meg). A beküldő
// (és csak ő) személyes értesítést kap, hogy elfogadtuk, és hol olvashatja a visszajelzést.
export async function POST(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await readJson(req, 20000)) || {};
  const puzzleId = typeof body.puzzleId === 'string' ? body.puzzleId.slice(0, 100) : '';
  if (!puzzleId) return Response.json({ error: 'invalid-body' }, { status: 400 });
  const items = sanitizeFeedbackItems(body.items);
  const admin = await adminUser();
  const feedback = {
    by: String(admin?.name || 'A szerkesztőség').slice(0, 60),
    at: new Date().toISOString(),
    items,
  };
  const locked = await kv.withLock('puzzles-save', async () => {
    const list = (await kv.get('puzzles:list')) || [];
    const p = list.find((x) => x.id === puzzleId);
    if (!p) return null;
    p.feedback = feedback;
    await kv.set('puzzles:list', list);
    return { email: p.submittedByEmail || '', clue: p.clue || '' };
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  if (!locked.value) return Response.json({ error: 'not-found' }, { status: 404 });

  let notified = false;
  if (locked.value.email) {
    const short = locked.value.clue.length > 60 ? `${locked.value.clue.slice(0, 57)}…` : locked.value.clue;
    notified = await pushUserNotification(locked.value.email, {
      text: `Elfogadtuk a beküldött titkosírásodat („${short}”)! ${feedback.by} visszajelzést írt hozzá - elolvashatod a Profilom oldalon, az Elfogadott beküldéseim között.`,
      href: '/account',
    });
  }
  return Response.json({ ok: true, feedback, notified });
}
