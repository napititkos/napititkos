export const dynamic = 'force-dynamic';

import { isAdminRequest } from '../../../../lib/adminAuth';

const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });
import { todayStr, isValidDateStr } from '../../../../lib/date';
import { readJson } from '../../../../lib/validate';
import { regenerateSudoku, sudokuForDate, sudokuNumber, sudokuSize } from '../../../../lib/sudoku';

// Admin: a mai és a következő 7 nap sudokuja (nehézséggel), és egy jövőbeli nap cseréje.
// ?size=9 / { size: 9 }: a 9x9-es rejtvények (alapból a 6x6-osak).
const addDays = (d, n) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const size = sudokuSize(new URL(req.url).searchParams.get('size'));
  const days = [];
  for (let i = 0; i <= 7; i++) {
    const p = await sudokuForDate(addDays(todayStr(), i), { size });
    if (p) days.push({ date: p.date, number: sudokuNumber(p.date), level: p.level, clues: p.clues, givens: p.givens });
  }
  return Response.json({ size, days }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await readJson(req, 2000)) || {};
  const d = String(body.date || '');
  if (body.action !== 'regenerate' || !isValidDateStr(d) || d <= todayStr() || d > addDays(todayStr(), 7)) return Response.json({ error: 'invalid', message: 'Csak a következő 7 nap rejtvénye cserélhető.' }, { status: 400 });
  const p = await regenerateSudoku(d, sudokuSize(body.size));
  return Response.json({ ok: true, date: d, size: sudokuSize(body.size), clues: p.clues, level: p.level });
}
