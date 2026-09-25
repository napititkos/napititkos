export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { kv } from '../../../lib/kv';
import { auth } from '../../../auth';
import { todayStr, isValidDateStr } from '../../../lib/date';
import { adminUser, isAdminRequest } from '../../../lib/adminAuth';
import { isLimited, tooMany } from '../../../lib/rateLimit';
import { cleanName, readJson } from '../../../lib/validate';

// Kommentek titkosírásonként (napi dátum szerint), tartósan tárolva, hogy a korábbi
// titkosírásoknál is visszanézhetők legyenek. A főoldal mindig csak a mai napét mutatja,
// így éjfélkor "kiürül". Írni csak bejelentkezett, megerősített fiókkal lehet, és csak a
// mai titkosíráshoz. A megjelenő név a fiókból jön (soha nem e-mail-cím).

const MAX_TEXT = 500;
const MAX_PER_DAY = 1000;
const key = (date) => `comments:${date}`;

function cleanText(v) {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('date');
  const date = requested && isValidDateStr(requested) ? requested : todayStr();
  const r = kv.raw();
  // Csak a darabszám (a gomb feliratához), a tartalom lekérése nélkül.
  if (searchParams.get('count') === '1') {
    return Response.json({ count: await r.llen(key(date)) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  // A tartalom (ami a megfejtést is elárulhatja) csak bejelentkezve látható.
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const raw = await r.lrange(key(date), 0, -1);
  const comments = raw
    .map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .map((c) => ({ id: c.id, name: c.name, text: c.text, ts: c.ts, mine: c.uid === session.user.id }));
  return Response.json({ comments }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  if (!session.user.verified) return Response.json({ error: 'unverified' }, { status: 403 });
  if (await isLimited('comment:user', session.user.id, 10, 3600)) return tooMany(3600);

  const body = await readJson(req, 4000);
  const text = cleanText(body?.text);
  if (!text) return Response.json({ error: 'empty' }, { status: 400 });

  const date = todayStr();
  const r = kv.raw();
  if ((await r.llen(key(date))) >= MAX_PER_DAY) return Response.json({ error: 'full' }, { status: 429 });

  const comment = {
    id: crypto.randomBytes(8).toString('hex'),
    uid: session.user.id,
    name: cleanName(session.user.name, 'Névtelen'),
    text,
    ts: Date.now(),
  };
  await r.rpush(key(date), JSON.stringify(comment));
  return Response.json({ ok: true, comment: { ...comment, uid: undefined, mine: true } });
}

// Törlés: a saját kommentjét bárki, bármelyiket az admin (admin munkamenet vagy admin szerepkör).
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const id = searchParams.get('id');
  if (!isValidDateStr(date) || !id) return Response.json({ error: 'invalid' }, { status: 400 });
  const session = await auth();
  const isAdmin = (await isAdminRequest(req)) || !!(await adminUser());
  if (!isAdmin && !session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const result = await kv.withLock(`comments:${date}`, async () => {
    const r = kv.raw();
    const raw = await r.lrange(key(date), 0, -1);
    const target = raw.find((s) => {
      try {
        return JSON.parse(s).id === id;
      } catch {
        return false;
      }
    });
    if (!target) return 'not-found';
    if (!isAdmin && JSON.parse(target).uid !== session.user.id) return 'forbidden';
    await r.lrem(key(date), 1, target);
    return 'ok';
  });
  if (!result) return Response.json({ error: 'busy' }, { status: 503 });
  if (result.value === 'forbidden') return Response.json({ error: 'forbidden' }, { status: 403 });
  if (result.value === 'not-found') return Response.json({ error: 'not-found' }, { status: 404 });
  return Response.json({ ok: true });
}
