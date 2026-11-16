// Heti mini ütemezés (tiszta függvények, egységtesztelhető).
// A várólista elemein opcionális `scheduledWeek` (hétfői dátum): ha meg van adva, a mini pontosan
// azon a héten jelenik meg. A többi a várólista sorrendjében kerül sorra, a beütemezett hetek
// kihagyásával. Az elmúlt hétre ütemezett (le nem futott) elem sima várólistás elemként viselkedik.

export const addWeeks = (week, n) => {
  const d = new Date(`${week}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return d.toISOString().slice(0, 10);
};

export const isMonday = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && new Date(`${d}T12:00:00Z`).getUTCDay() === 1;

// Az adott hétre kiválasztott elem indexe (-1, ha nincs mit kitenni).
export function pickForWeek(queue, week) {
  const exact = queue.findIndex((q) => q.scheduledWeek === week);
  if (exact >= 0) return exact;
  return queue.findIndex((q) => !q.scheduledWeek || q.scheduledWeek < week);
}

// A várólista elemeinek várható hete: { [id]: hétfő }. firstWeek: az első szabad hét.
export function planQueue(queue, firstWeek) {
  const rest = queue.slice();
  const out = {};
  let week = firstWeek;
  for (let guard = 0; rest.length && guard < 1040; guard++) {
    const i = pickForWeek(rest, week);
    if (i >= 0) out[rest.splice(i, 1)[0].id] = week;
    week = addWeeks(week, 1);
  }
  return out;
}
