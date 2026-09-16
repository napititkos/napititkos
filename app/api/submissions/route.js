export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { isAdminRequest } from '../../../lib/adminAuth';

export async function GET(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const list = (await kv.get('submissions:list')) || [];
  return Response.json({ submissions: list });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.clue || !body.answer) {
    return Response.json({ error: 'missing-fields' }, { status: 400 });
  }
  const list = (await kv.get('submissions:list')) || [];
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: (body.name || 'Névtelen').toString().slice(0, 60),
    clue: body.clue.toString().slice(0, 400),
    answer: body.answer.toString().slice(0, 60),
    hints: {
      fodder: (body.hints?.fodder || '').toString().slice(0, 300),
      indikator: (body.hints?.indikator || '').toString().slice(0, 300),
      definicio: (body.hints?.definicio || '').toString().slice(0, 300),
      alternativ: (body.hints?.alternativ || '').toString().slice(0, 300),
    },
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  await kv.set('submissions:list', list.slice(0, 500));
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const list = (await kv.get('submissions:list')) || [];
  await kv.set('submissions:list', list.filter((s) => s.id !== id));
  return Response.json({ ok: true });
}
