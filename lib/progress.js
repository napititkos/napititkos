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
    archiveSolved: [],
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

// Bejelentkezés után ez engedélyezi, hogy minden mentés a szerverre is
// felkerüljön (fiókhoz kötött szinkronizálás). Kijelentkezéskor visszaáll.
let syncEnabled = false;
export function setProgressSyncEnabled(v) {
  syncEnabled = v;
}

export function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
  if (syncEnabled) {
    fetch('/api/account/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    }).catch(() => {});
  }
}

// Összefésüli az eszközön (localStorage) és a fiókban (szerver) tárolt
// haladást, hogy bejelentkezéskor semmi ne vesszen el egyik oldalon sem.
export function mergeProgress(local, server) {
  if (!server) return local || defaultProgress();
  if (!local) return server;

  const history = { ...server.history, ...local.history };
  const unlocked = Array.from(new Set([...(server.unlocked || []), ...(local.unlocked || [])]));
  const totalSolved = Math.max(server.totalSolved || 0, local.totalSolved || 0);
  const noHintSolves = Math.max(server.noHintSolves || 0, local.noHintSolves || 0);
  const times = [server.fastestTime, local.fastestTime].filter((v) => v != null);
  const fastestTime = times.length ? Math.min(...times) : null;
  const submittedPuzzle = !!(server.submittedPuzzle || local.submittedPuzzle);
  const readHelp = !!(server.readHelp || local.readHelp);
  const archiveSolved = Array.from(new Set([...(server.archiveSolved || []), ...(local.archiveSolved || [])]));

  let streak = local.streak || 0;
  let lastDate = local.lastDate || null;
  if (server.lastDate && (!lastDate || server.lastDate > lastDate)) {
    streak = server.streak || 0;
    lastDate = server.lastDate;
  }
  const best = Math.max(server.best || 0, local.best || 0, streak);

  return {
    lastDate,
    streak,
    best,
    history,
    totalSolved,
    noHintSolves,
    fastestTime,
    submittedPuzzle,
    readHelp,
    unlocked,
    archiveSolved,
  };
}
