// ISO-hét: az év hanyadik hete (hétfőtől vasárnapig). A heti minik címkéjéhez: „2026. 46. hét”.
export function isoWeek(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // hétfő = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // az adott hét csütörtöke dönti el az évet
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return { year, week };
}

export function weekLabel(dateStr) {
  try {
    const { year, week } = isoWeek(dateStr);
    return `${year}. ${week}. hét`;
  } catch {
    return '';
  }
}
