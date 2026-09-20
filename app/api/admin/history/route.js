export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';

export async function GET(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const history = (await kv.get('rotation:history')) || [];
  const state = (await kv.get('rotation:state')) || null;
  return Response.json({ history, currentId: state?.currentId || null });
}
