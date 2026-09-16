export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';

export async function GET(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const puzzles = (await kv.get('puzzles:list')) || [];
  return Response.json({ puzzles });
}

export async function POST(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.puzzles)) {
    return Response.json({ error: 'invalid-body' }, { status: 400 });
  }
  await kv.set('puzzles:list', body.puzzles);
  return Response.json({ ok: true });
}
