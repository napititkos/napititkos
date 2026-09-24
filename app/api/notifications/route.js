export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';

// Az admin által kiírt értesítések (legújabb elöl). Mindenkinek ugyanaz.
export async function GET() {
  const list = (await kv.get('notifications:list')) || [];
  return Response.json(
    { notifications: list.slice(0, 20).map(({ id, text, ts }) => ({ id, text, ts })) },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
  );
}
