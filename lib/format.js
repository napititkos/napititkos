// A válasz "enumerációja" - pl. egy 9 betűs válasznál "(9)",
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

// Egy YYYY-MM-DD dátum magyar, hosszú alakban (pl. "2026. október 29.").
const HU_DATE = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export function huDate(dateStr) {
  return HU_DATE.format(new Date(`${dateStr}T12:00:00Z`));
}
