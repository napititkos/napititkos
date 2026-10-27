// A tutorial három tervezett szekciója. Egyelőre nincs bennük valódi feladat,
// de a szerkezet (haladás, 0/1 jelzés) már most készen áll, hogy később
// könnyű legyen hozzájuk feladatokat rendelni.
export const TUTORIAL_SECTIONS = [
  { id: 'kezdetek', title: 'Kezdetek', icon: '/icons/Tutorial.png', totalTasks: 1 },
  { id: 'szojatek', title: 'Szójáték', icon: '/icons/Tutorial_szojatek.png', totalTasks: 2 },
  { id: 'betujatek', title: 'Betűjáték', icon: '/icons/Tutorial_betujatek.png', totalTasks: 2 },
  { id: 'joker', title: 'Joker', icon: '/icons/Tutorial_joker.png', totalTasks: 2 },
];

const KEY = 'titkositas_tutorial_v1';

export function loadTutorialProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizeTutorialProgress(JSON.parse(raw));
  } catch {}
  const initial = {};
  TUTORIAL_SECTIONS.forEach((s) => (initial[s.id] = 0));
  return initial;
}

// A kétfeladatos szakaszoknál a feladatonkénti jelzők (<szakasz>_1, _2) és a darabszám
// összhangja: a szerver (és a régebbi verziók) csak a darabszámot ismerik, ebből állítjuk vissza
// a jelzőket, illetve a jelzőkből a darabszámot.
export function normalizeTutorialProgress(p) {
  const out = { ...(p || {}) };
  for (const s of TUTORIAL_SECTIONS) {
    if (s.totalTasks < 2) continue;
    const n = out[s.id] || 0;
    if (n >= 1 && !out[`${s.id}_1`] && !out[`${s.id}_2`]) out[`${s.id}_1`] = 1;
    if (n >= 2) {
      out[`${s.id}_1`] = 1;
      out[`${s.id}_2`] = 1;
    }
    out[s.id] = Math.max(n, (out[`${s.id}_1`] || 0) + (out[`${s.id}_2`] || 0));
  }
  return out;
}

export function saveTutorialProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {}
  // A Kisokos oldal ebből frissül (pl. ha bejelentkezéskor a szerverről érkezik haladás).
  try {
    window.dispatchEvent(new CustomEvent('tutorial-progress', { detail: normalizeTutorialProgress(progress) }));
  } catch {}
  if (tutorialSyncEnabled) {
    fetch('/api/account/tutorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    }).catch(() => {});
  }
}

let tutorialSyncEnabled = false;
// Megtörtént-e már (ezen az oldalbetöltésen) a bejelentkezett felhasználó haladásának
// összefésülése a szerverrel.
export function isTutorialSynced() {
  return tutorialSyncEnabled;
}
export function setTutorialSyncEnabled(v) {
  tutorialSyncEnabled = v;
}

export function mergeTutorialProgress(local, server) {
  if (!server) return local;
  const merged = { ...local };
  for (const section of TUTORIAL_SECTIONS) {
    merged[section.id] = Math.max(local[section.id] || 0, server[section.id] || 0);
  }
  return merged;
}

export function completedSectionsCount(progress) {
  return TUTORIAL_SECTIONS.filter((s) => (progress[s.id] || 0) >= s.totalTasks).length;
}

// A többi rész a Kezdetek után nyílik meg. Aki korábban (a Kezdetek bevezetése előtt) már
// haladt valamelyik résszel, annak nem zárjuk vissza.
export function basicsUnlocked(progress) {
  if (!progress) return false;
  if ((progress.kezdetek || 0) >= 1) return true;
  return TUTORIAL_SECTIONS.some((s) => s.id !== 'kezdetek' && (progress[s.id] || 0) > 0);
}

// Melyik feladat bevezetőjét (kos-üzenetét) látta már: azt nem mutatjuk újra magától,
// csak a feladat címe melletti kos gombbal.
const SEEN_KEY = 'titkositas_tutorial_seen_v1';
export function isIntroSeen(id) {
  try {
    return (JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') || []).includes(id);
  } catch {
    return false;
  }
}
export function markIntroSeen(id) {
  try {
    const list = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') || [];
    if (!list.includes(id)) localStorage.setItem(SEEN_KEY, JSON.stringify([...list, id]));
  } catch {}
}
