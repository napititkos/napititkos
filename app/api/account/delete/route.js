export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';

// Fióktörlés (GDPR 17. cikk): a fiók, a haladás, a kapcsolt szolgáltatói azonosítók, a
// beküldések és a ranglista-bejegyzések törlése. A beküldött és már közzétett rejtvények
// szövege megmarad (a szerző hozzájárult a felhasználásukhoz), de a nevet és az e-mail-címet
// eltávolítjuk mellőlük.
export async function POST(req) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const body = await readJson(req, 500);
  if (body?.confirm !== true) return Response.json({ error: 'confirmation-required' }, { status: 400 });
  const id = session.user.id;
  if (await isLimited('delete:user', id, 3, 3600)) return tooMany(3600);

  const user = await kv.get(`au:user:${id}`);
  const r = kv.raw();
  const email = String(user?.email || session.user.email || '').toLowerCase();

  // Fiók és kapcsolt (pl. Google) azonosítók.
  const accountKeys = await kv.scan('au:account:*');
  const accounts = await kv.mget(accountKeys);
  const linked = accountKeys.filter((_, i) => accounts[i]?.userId === id);
  const emailKeys = [...new Set([user?.email, email].filter(Boolean).map((e) => `au:userByEmail:${e}`))];
  const ownedEmailKeys = [];
  for (const k of emailKeys) if ((await kv.get(k)) === id) ownedEmailKeys.push(k);
  await r.del(`au:user:${id}`, `progress:${id}`, `tutorial:${id}`, ...ownedEmailKeys, ...linked);

  // Függőben lévő beküldések törlése.
  await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    const kept = list.filter((s) => String(s.submitterEmail || '').toLowerCase() !== email);
    if (kept.length !== list.length) await kv.set('submissions:list', kept);
  });

  // Már közzétett rejtvények: a szerzői név és e-mail eltávolítása.
  const ownPuzzleIds = new Set();
  await kv.withLock('puzzles-save', async () => {
    const list = (await kv.get('puzzles:list')) || [];
    let changed = false;
    for (const p of list) {
      if (String(p.submittedByEmail || '').toLowerCase() === email) {
        ownPuzzleIds.add(p.id);
        p.submittedBy = '';
        p.submittedByEmail = '';
        changed = true;
      }
    }
    if (changed) await kv.set('puzzles:list', list);
  });
  if (ownPuzzleIds.size) {
    const history = (await kv.get('rotation:history')) || [];
    let changed = false;
    for (const h of history) {
      if (ownPuzzleIds.has(h.id) && h.submittedBy) {
        h.submittedBy = '';
        changed = true;
      }
    }
    if (changed) await kv.set('rotation:history', history);
  }

  // Ranglista-bejegyzések (az utóbbi ~45 napból).
  const playerKey = `u:${id}`;
  for (const k of await kv.scan('leaderboard:z:*')) await r.zrem(k, playerKey);
  for (const k of await kv.scan('leaderboard:n:*')) await r.hdel(k, playerKey);

  return Response.json({ ok: true });
}
