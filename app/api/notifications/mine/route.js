export const dynamic = 'force-dynamic';

import { auth } from '../../../../auth';
import { userNotifications } from '../../../../lib/userNotifications';

// A bejelentkezett felhasználó személyes értesítései (pl. elfogadott beküldés). Személyes
// adat: sem a CDN, sem a böngésző nem tárolhatja.
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ notifications: [] }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  const list = await userNotifications(session.user.email);
  return Response.json(
    { notifications: list.map(({ id, text, ts, href }) => ({ id, text, ts, href: href && href.startsWith('/') ? href : '' })) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
