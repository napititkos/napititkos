export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const progress = await kv.get(`tutorial:${session.user.id}`);
  return Response.json({ progress: progress || null });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: 'invalid-body' }, { status: 400 });
  await kv.set(`tutorial:${session.user.id}`, body);
  return Response.json({ ok: true });
}
