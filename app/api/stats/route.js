export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { todayStr } from '../../../lib/date';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const date = body.date || todayStr();
  const key = `stats:${date}`;
  const current = (await kv.get(key)) || { completions: 0, totalHints: 0 };
  current.completions += 1;
  current.totalHints += Number(body.hintsUsed || 0);
  await kv.set(key, current);
  return Response.json({ ok: true });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || todayStr();
  const key = `stats:${date}`;
  const current = (await kv.get(key)) || { completions: 0, totalHints: 0 };
  const average = current.completions ? current.totalHints / current.completions : 0;
  return Response.json({ completions: current.completions, average });
}
