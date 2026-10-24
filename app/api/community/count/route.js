export const dynamic = 'force-dynamic';

import { communityList, migrateLegacyOnce, roundedCount } from '../../../../lib/community';

// Vendégeknek: hány közösségi titkosírás várja őket regisztráció után (tízesre kerekítve, "30+").
export async function GET() {
  await migrateLegacyOnce();
  const list = await communityList();
  const n = list.length;
  // A legutóbbi beküldés ideje: a főoldal ebből jelzi az "Új!" közösségi titkosírásokat.
  const latestAt = list.reduce((mx, s) => Math.max(mx, Date.parse(s.createdAt) || 0), 0);
  return Response.json({ display: roundedCount(n), latestAt }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
}
