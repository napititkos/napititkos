export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { adminUser, isAdminRequest } from '../../../../lib/adminAuth';
import { readJson } from '../../../../lib/validate';
import { pushRejection, pushUserNotification } from '../../../../lib/userNotifications';

// Beküldés elutasítása (törlése), opcionális indoklással. Ha az admin írt indoklást, a beküldő
// a Profilomban olvashatja (az admin nevével), és személyes értesítést kap. Üres indoklásnál
// csak törlődik a beküldés: nem jelenik meg semmi, nincs értesítés.
export async function POST(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await readJson(req, 8000)) || {};
  const id = typeof body.id === 'string' ? body.id.slice(0, 100) : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 2000) : '';
  if (!id) return Response.json({ error: 'invalid-body' }, { status: 400 });
  const locked = await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    const sub = list.find((s) => s.id === id);
    if (!sub) return null;
    await kv.set('submissions:list', list.filter((s) => s.id !== id));
    return sub;
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  const sub = locked.value;
  if (!sub) return Response.json({ error: 'not-found' }, { status: 404 });

  let notified = false;
  if (reason && sub.submitterEmail) {
    const admin = await adminUser();
    const by = String(admin?.name || 'A szerkesztőség').slice(0, 60);
    await pushRejection(sub.submitterEmail, {
      clue: String(sub.clue || '').slice(0, 500),
      answer: String(sub.answer || '').slice(0, 100),
      reason,
      by,
      at: new Date().toISOString(),
    });
    const short = String(sub.clue || '').length > 60 ? `${sub.clue.slice(0, 57)}…` : sub.clue;
    notified = await pushUserNotification(sub.submitterEmail, {
      text: `A beküldött titkosírásodat („${short}”) most nem tudtuk elfogadni. ${by} indoklást írt hozzá - elolvashatod a Profilom oldalon.`,
      href: '/account',
    });
  }
  return Response.json({ ok: true, notified });
}
