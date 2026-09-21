export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { isLimited, tooMany } from '../../../../lib/rateLimit';

// Adathordozhatóság (GDPR 20. cikk): a fiókhoz tartozó összes adat JSON-ban.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const id = session.user.id;
  if (await isLimited('export:user', id, 5, 3600)) return tooMany(3600);

  const user = await kv.get(`au:user:${id}`);
  if (!user) return Response.json({ error: 'not-found' }, { status: 404 });
  const email = String(user.email || '').toLowerCase();

  const accountKeys = await kv.scan('au:account:*');
  const accounts = await kv.mget(accountKeys);
  const providers = accounts.filter((a) => a?.userId === id).map((a) => a.provider);

  const submissions = ((await kv.get('submissions:list')) || []).filter(
    (s) => String(s.submitterEmail || '').toLowerCase() === email
  );
  const publishedPuzzles = ((await kv.get('puzzles:list')) || [])
    .filter((p) => String(p.submittedByEmail || '').toLowerCase() === email)
    .map((p) => ({ id: p.id, clue: p.clue, answer: p.answer, hints: p.hints }));

  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role || 'user',
      emailVerified: user.emailVerified || null,
      hasPassword: !!user.passwordHash,
      providers,
    },
    progress: (await kv.get(`progress:${id}`)) || null,
    tutorial: (await kv.get(`tutorial:${id}`)) || null,
    submissions,
    publishedPuzzles,
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="titkositas-adataim.json"',
      'Cache-Control': 'no-store',
    },
  });
}
