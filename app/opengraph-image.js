import { OG, OG_SIZE, renderWordmark } from '../lib/ogWordmark';

export const runtime = 'nodejs';
export const alt = OG.napi.alt;
export const size = OG_SIZE;
export const contentType = 'image/png';

// A főoldal megosztási képe: NAPITITKOS.HU, alatta a három játék.
export default async function Image() {
  return renderWordmark(OG.napi);
}
