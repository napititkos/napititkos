export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { isAdminRequest } from '../../../lib/adminAuth';
import { auth } from '../../../auth';
import { isLimited, tooMany } from '../../../lib/rateLimit';
import { readJson } from '../../../lib/validate';

export async function GET(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const list = (await kv.get('submissions:list')) || [];
  return Response.json({ submissions: list });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'unauthenticated', message: 'A beküldéshez be kell jelentkezned.' }, { status: 401 });
  }
  if (!session.user.verified) {
    return Response.json(
      { error: 'unverified', message: 'A beküldéshez meg kell erősítened az email címedet.' },
      { status: 403 }
    );
  }
  // Spam ellen: felhasználónként óránként 10 beküldés.
  if (await isLimited('submit:user', session.user.id || session.user.email, 10, 3600)) return tooMany(3600);

  const body = await readJson(req, 10000);
  const clue = typeof body?.clue === 'string' ? body.clue.trim() : '';
  const answer = typeof body?.answer === 'string' ? body.answer.trim() : '';
  if (!clue || !answer) {
    return Response.json({ error: 'missing-fields' }, { status: 400 });
  }
  const hint = (v) => (typeof v === 'string' ? v.slice(0, 300) : '');
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: (session.user.name || session.user.email || 'Névtelen').toString().slice(0, 60),
    submitterEmail: session.user.email,
    clue: clue.slice(0, 400),
    answer: answer.slice(0, 60),
    hints: {
      fodder: hint(body.hints?.fodder),
      indikator: hint(body.hints?.indikator),
      definicio: hint(body.hints?.definicio),
      alternativ: hint(body.hints?.alternativ),
    },
    createdAt: new Date().toISOString(),
  };
  // Olvasás-módosítás-írás zár alatt, hogy párhuzamos beküldések ne írják felül egymást.
  const locked = await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    list.unshift(entry);
    await kv.set('submissions:list', list.slice(0, 500));
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const locked = await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    await kv.set('submissions:list', list.filter((s) => s.id !== id));
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  return Response.json({ ok: true });
}
