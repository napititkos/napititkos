// A tutorial három tervezett szekciója. Egyelőre nincs bennük valódi feladat,
// de a szerkezet (haladás, 0/1 jelzés) már most készen áll, hogy később
// könnyű legyen hozzájuk feladatokat rendelni.
export const TUTORIAL_SECTIONS = [
  { id: 'szojatek', title: 'Szójáték', icon: '/icons/Tutorial_szojatek.png', totalTasks: 1 },
  { id: 'betujatek', title: 'Betűjáték', icon: '/icons/Tutorial_betujatek.png', totalTasks: 1 },
  { id: 'joker', title: 'Joker', icon: '/icons/Tutorial_joker.png', totalTasks: 1 },
];

const KEY = 'titkositas_tutorial_v1';

export function loadTutorialProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial = {};
  TUTORIAL_SECTIONS.forEach((s) => (initial[s.id] = 0));
  return initial;
}

export function saveTutorialProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
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
