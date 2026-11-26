import { isXmasDate } from '../lib/xmas';
import { OG, OG_SIZE, renderWordmark } from '../lib/ogWordmark';

export const runtime = 'nodejs';
// December 1–25. között karácsonyi kép: óránként újragenerálódik, hogy a dátumot kövesse.
export const revalidate = 3600;
export const alt = OG.napi.alt;
export const size = OG_SIZE;
export const contentType = 'image/png';

// A főoldal megosztási képe: NAPITITKOS.HU, alatta a három játék.
export default async function Image() {
  return renderWordmark({ ...OG.napi, xmas: isXmasDate() });
}
