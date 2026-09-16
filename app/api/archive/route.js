export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';

export async function GET() {
  const history = (await kv.get('rotation:history')) || [];
  // Az utolsó bejegyzés mindig a jelenleg AKTÍV titkosírás — azt nem mutatjuk,
  // nehogy lelőjük a ma megfejtendő rejtvény válaszát.
  const past = history.slice(0, -1).reverse();
  return Response.json({ archive: past });
}
