// A rejtvények váltása budapesti éjfélkor van, ezért a "mai nap" is budapesti naptári
// nap (nem UTC) - különben 0 és 1-2 óra között az új rejtvény a régi dátumot kapná.
const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Budapest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayStr(now = new Date()) {
  return DAY_FORMAT.format(now);
}

export function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Az előző naptári nap YYYY-MM-DD alakban (tisztán szövegműveletként, időzóna nélkül).
export function previousDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
