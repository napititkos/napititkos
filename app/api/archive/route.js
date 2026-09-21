export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';

export async function GET() {
  const history = (await kv.get('rotation:history')) || [];
  // Az utolsó bejegyzés mindig a jelenleg AKTÍV titkosírás - azt nem mutatjuk,
  // nehogy lelőjük a ma megfejtendő rejtvény válaszát.
  const past = history.slice(0, -1).reverse();
  // Mindenkinek ugyanaz, ezért a CDN rövid ideig gyorsítótárazhatja.
  return Response.json(
    { archive: past },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
