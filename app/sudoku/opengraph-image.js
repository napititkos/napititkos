import { OG, OG_SIZE, renderWordmark } from '../../lib/ogWordmark';

export const runtime = 'nodejs';
export const alt = OG.sudoku.alt;
export const size = OG_SIZE;
export const contentType = 'image/png';

// A sudoku saját megosztási képe (a fejléc feliratával).
export default async function Image() {
  return renderWordmark(OG.sudoku);
}
