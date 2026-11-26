// Karácsonyi időszak: december 1–25. (a nap ÉÉÉÉ-HH-NN formában, budapesti dátum).
import { todayStr } from './date.js';

export function isXmasDate(d = todayStr()) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return !!m && m[1] === '12' && Number(m[2]) <= 25;
}

// Képcímekben kipróbálható: ?x=1 (karácsonyi) / ?x=0 (normál); egyébként a dátum dönt.
export function xmasFor(url, d) {
  const x = new URL(url).searchParams.get('x');
  return x === '1' ? true : x === '0' ? false : isXmasDate(d);
}
