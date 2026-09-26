// Névtelen, véletlenszerű eszközazonosító a "hányan fejtik még" számláláshoz. Nem
// tartalmaz személyes adatot, és semmihez nincs kötve (se fiókhoz, se névhez).
const KEY = 'titkositas_device_v1';

export function deviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!/^[a-f0-9]{32}$/.test(id || '')) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      id = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
