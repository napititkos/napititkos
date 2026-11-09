// Visszaszámlálók a budapesti idő szerint (a ranglista nullázódásához): a napi titkosírás éjfélkor,
// a heti mini hétfő 00:00-kor indul újra. Kliens- és szerveroldalon is használható.
function parts(now) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Budapest', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
  return { dow, secs: (Number(p.hour) % 24) * 3600 + Number(p.minute) * 60 + Number(p.second) };
}

export function msUntilMidnight(now = new Date()) {
  return (86400 - parts(now).secs) * 1000;
}

export function msUntilMonday(now = new Date()) {
  const { dow, secs } = parts(now);
  return ((7 - dow) * 86400 - secs) * 1000;
}

export function fmtHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtDHM(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return `${d} nap ${h} óra ${m % 60} perc`;
}
