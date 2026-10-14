export const dynamic = 'force-dynamic';

import { communityList, migrateLegacyOnce, roundedCount } from '../../../../lib/community';

// Vendégeknek: hány közösségi titkosírás várja őket regisztráció után (tízesre kerekítve, "30+").
export async function GET() {
  await migrateLegacyOnce();
  const n = (await communityList()).length;
  return Response.json({ display: roundedCount(n) }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
