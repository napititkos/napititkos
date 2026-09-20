// Vendég-azonosító: eszközönként egyszer legenerált, véletlen név + kód,
// amíg nincs regisztráció. A ranglistán ez jelenik meg névként.
const KEY = 'titkositas_identity_v1';
const ADJECTIVES = ['Gyors', 'Bölcs', 'Vidám', 'Ravasz', 'Csendes', 'Bátor', 'Ügyes', 'Kíváncsi', 'Fürge', 'Rejtélyes'];
const NOUNS = ['Róka', 'Bagoly', 'Sólyom', 'Medve', 'Farkas', 'Nyúl', 'Hiúz', 'Sas', 'Hattyú', 'Oroszlán'];

function randomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function getIdentity() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const identity = { name: `${adj}${noun}#${randomCode()}`, guest: true };
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {}
  return identity;
}
