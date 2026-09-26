// Aktív játékidő: csak akkor számol, amikor az oldal ténylegesen látható (a háttérben,
// másik lapon vagy lezárt képernyőnél megáll). A felgyűlt időt napra kötve mentjük, így
// frissítés, bezárás vagy a böngésző összeomlása után is onnan folytatódik.
const KEY = 'titkositas_timer_v2';

export function loadActiveMs(date) {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (t && t.date === date && Number.isFinite(t.acc) && t.acc >= 0) return t.acc;
  } catch {}
  return 0;
}

export function saveActiveMs(date, acc) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date, acc: Math.max(0, Math.round(acc)) }));
  } catch {}
}

export function clearActiveTimer() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('titkositas_starttime_v1'); // a korábbi (háttérben is számoló) változat
  } catch {}
}
