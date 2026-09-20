// A tutorial három tervezett szekciója. Egyelőre nincs bennük valódi feladat,
// de a szerkezet (haladás, 0/1 jelzés) már most készen áll, hogy később
// könnyű legyen hozzájuk feladatokat rendelni.
export const TUTORIAL_SECTIONS = [
  { id: 'szojatek', title: 'Szójáték', emoji: '🧩', totalTasks: 1 },
  { id: 'betujatek', title: 'Betűjáték', emoji: '🔤', totalTasks: 1 },
  { id: 'joker', title: 'Joker', emoji: '🃏', totalTasks: 1 },
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
}

export function completedSectionsCount(progress) {
  return TUTORIAL_SECTIONS.filter((s) => (progress[s.id] || 0) >= s.totalTasks).length;
}
