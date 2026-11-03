export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { EMOJIS, communityList, deleteCommunityData, deleteCommunityNotifications, ratingsKey, reactionsKey, solvedKey, summaries, toPlayable } from '../../../../lib/community';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { enumerationFor } from '../../../../lib/format';
import { isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';

// Egy közösségi titkosírás lejátszáshoz (a megoldással együtt, ahogy a napi rejtvénynél is),
// az értékelés és a reakciók összesítésével, és a bejelentkezett felhasználó saját állapotával.
export async function GET(req, { params }) {
  const { id } = await params;
  const session = await auth();
  const s = (await communityList()).find((x) => x.id === id);
  if (!s) return Response.json({ error: 'not-found' }, { status: 404 });
  // Vendégnek (megosztott linkről) csak egy előnézet jár: a rejtvény szövege, a betűszám, a
  // beküldő és az értékelés - a megoldás és a tippek nem, megfejteni csak bejelentkezve lehet.
  if (!session?.user) {
    const sum = (await summaries([id]))[id];
    return Response.json(
      {
        preview: true,
        puzzle: {
          id: s.id,
          clue: s.clue,
          enumeration: enumerationFor(String(s.answer || '').toUpperCase()),
          submittedBy: s.name && s.name !== 'Névtelen' ? s.name : '',
          createdAt: s.createdAt,
        },
        avg: sum.avg,
        ratingCount: sum.ratingCount,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
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

// A beküldő a saját közösségi titkosírását szerkesztheti (szöveg, megfejtés, tippek). A korábbi
// megfejtések, értékelések és reakciók megmaradnak. Ha a titkosírást beemelték a napi
// titkosírások közé, a beemelt példány külön marad: azt csak az admin módosíthatja.
export async function PATCH(req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  if (!session.user.verified) return Response.json({ error: 'unverified', message: 'A szerkesztéshez meg kell erősítened az e-mail-címedet.' }, { status: 403 });
  if (await isLimited('community:edit', session.user.id || session.user.email, 30, 3600)) return tooMany(3600);
  const body = (await readJson(req, 10000)) || {};
  const clue = typeof body.clue === 'string' ? body.clue.trim() : '';
  const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
  if (!clue || !answer) return Response.json({ error: 'missing-fields', message: 'A rejtvény szövege és a válasz kitöltése kötelező.' }, { status: 400 });
  const hint = (v) => (typeof v === 'string' ? v.slice(0, 300) : '');
  const hints = {
    fodder: hint(body.hints?.fodder),
    indikator: hint(body.hints?.indikator),
    definicio: hint(body.hints?.definicio),
    alternativ: hint(body.hints?.alternativ),
  };
  const hintWords = Object.fromEntries(
    ['definicio', 'indikator', 'fodder'].map((t) => [
      t,
      hints[t] && Array.isArray(body.hintWords?.[t])
        ? [...new Set(body.hintWords[t].map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 200))].slice(0, 40)
        : [],
    ])
  );
  const email = String(session.user.email).toLowerCase();
  const result = await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return { status: 404, error: 'not-found' };
    if (String(list[i].submitterEmail || '').toLowerCase() !== email) return { status: 403, error: 'forbidden' };
    list[i] = { ...list[i], clue: clue.slice(0, 400), answer: answer.slice(0, 60), hints, hintWords, editedAt: new Date().toISOString() };
    await kv.set('submissions:list', list);
    return { status: 200 };
  });
  if (!result) return Response.json({ error: 'busy' }, { status: 503 });
  const r = result.value;
  if (r.status !== 200) return Response.json({ error: r.error }, { status: r.status });
  return Response.json({ ok: true });
}

