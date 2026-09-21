export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { readJson, sanitizePuzzleList } from '../../../../lib/validate';

const BACKUP_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 nap
const BACKUP_COUNT = 10;

// GET /api/admin/puzzles                -> a jelenlegi lista
// GET /api/admin/puzzles?backups=1      -> a mentések időpontjai
// GET /api/admin/puzzles?backup=<ms>    -> egy korábbi mentés tartalma (visszaállításhoz)
export async function GET(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  if (searchParams.get('backups')) {
    const index = (await kv.get('puzzles:backups')) || [];
    return Response.json({ backups: index });
  }
  const ts = searchParams.get('backup');
  if (ts) {
    if (!/^\d{10,15}$/.test(ts)) return Response.json({ error: 'invalid-backup' }, { status: 400 });
    const backup = await kv.get(`puzzles:backup:${ts}`);
    if (!backup) return Response.json({ error: 'not-found' }, { status: 404 });
    return Response.json({ puzzles: backup });
  }
  const puzzles = (await kv.get('puzzles:list')) || [];
  return Response.json({ puzzles });
}

export async function POST(req) {
  if (!isAdminRequest(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await readJson(req, 1500000);
  const result = sanitizePuzzleList(body?.puzzles);
  if (result.error) {
    return Response.json({ error: result.error, index: result.index ?? null }, { status: 400 });
  }

  // Mentés a felülírás előtt: hiba vagy elrontott szerkesztés esetén visszaállítható.
  const locked = await kv.withLock('puzzles-save', async () => {
    const previous = await kv.get('puzzles:list');
    if (Array.isArray(previous) && previous.length) {
      const ts = String(Date.now());
      await kv.set(`puzzles:backup:${ts}`, previous, BACKUP_TTL_SECONDS);
      const index = ((await kv.get('puzzles:backups')) || []).filter((t) => t !== ts);
      index.unshift(ts);
      for (const old of index.splice(BACKUP_COUNT)) await kv.del(`puzzles:backup:${old}`);
      await kv.set('puzzles:backups', index);
    }
    await kv.set('puzzles:list', result.puzzles);
  });
  if (!locked) return Response.json({ error: 'busy' }, { status: 503 });
  return Response.json({ ok: true });
}
