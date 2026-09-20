export const dynamic = 'force-dynamic';

import { getSessionUser } from '../../../../lib/session';

export async function GET(req) {
  const user = await getSessionUser(req);
  return Response.json({ user });
}
