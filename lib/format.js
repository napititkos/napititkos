// A válasz "enumerációja" — pl. egy 9 betűs válasznál "(9)",
// egy két szóból álló, 4 és 5 betűs válasznál "(4,5)".
export function enumerationFor(answer) {
  const words = (answer || '').split(' ').filter(Boolean);
  if (words.length === 0) return '';
  return `(${words.map((w) => w.length).join(',')})`;
}

export function splitAnswerWords(answer) {
  const words = (answer || '').split(' ').filter(Boolean);
  return words.length ? words : [''];
}
