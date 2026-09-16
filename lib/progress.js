export const STORAGE_KEY = 'titkositas_progress_v2';

export function defaultProgress() {
  return {
    lastDate: null,
    streak: 0,
    best: 0,
    history: {},
    totalSolved: 0,
    noHintSolves: 0,
    fastestTime: null,
    submittedPuzzle: false,
    readHelp: false,
    unlocked: [],
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultProgress(), ...JSON.parse(raw) } : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}
