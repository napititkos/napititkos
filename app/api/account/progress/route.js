export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson, sanitizeProgress } from '../../../../lib/validate';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const progress = await kv.get(`progress:${session.user.id}`);
  return Response.json({ progress: progress || null });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  if (await isLimited('progress:user', session.user.id, 60, 60)) return tooMany(60);
  const body = await readJson(req, 60000);
  const progress = sanitizeProgress(body);
  if (!progress) return Response.json({ error: 'invalid-body' }, { status: 400 });
  await kv.set(`progress:${session.user.id}`, progress);
  return Response.json({ ok: true });
}
