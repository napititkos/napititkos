export const ACHIEVEMENTS = [
  // Elöl a Kisokos két trófeája (bevezető, teljes Kisokos), utána az összetartozók egymás mellett
  // (sorozat, idő, megfejtésszám, közösségi, egyéb). Az egykori "Olvasott" (read_help) trófea
  // megszűnt: a régi mentésekben maradt azonosítóját a számlálók nem veszik figyelembe.
  { id: 'intro_done', emoji: '🐣', title: 'Kezdő', desc: 'Végigcsináltad a Kisokos bevezetőjét.' },
  { id: 'tutorial_done', emoji: '🎓', title: 'Tanonc', desc: 'Végigcsináltad a Kisokos összes részét.' },
  { id: 'streak_3', emoji: '🔥', title: '3 napos sorozat', desc: '3 egymást követő napon játszottál.' },
  { id: 'streak_5', emoji: '🔥', title: '5 napos sorozat', desc: '5 egymást követő napon játszottál.' },
  { id: 'streak_10', emoji: '👑', title: '10 napos sorozat', desc: '10 egymást követő napon játszottál.' },
  { id: 'streak_20', emoji: '💎', title: '20 napos sorozat', desc: '20 egymást követő napon játszottál.' },
  { id: 'time_120', emoji: '⏱️', title: '2 percen belül', desc: 'Megfejtettél egyet 2 percen belül.' },
  { id: 'time_60', emoji: '⚡', title: '1 percen belül', desc: 'Megfejtettél egyet 1 percen belül.' },
  { id: 'time_30', emoji: '🚀', title: 'Fél percen belül', desc: 'Megfejtettél egyet fél percen belül.' },
  { id: 'no_hint', emoji: '🧠', title: 'Tiszta fejjel', desc: 'Megfejtettél egyet tipp nélkül.' },
  { id: 'all_hints', emoji: '😩', title: 'Elkeseredett', desc: 'Egy rejtvényhez az összes tippet felhasználtad.' },
  { id: 'solved_1', emoji: '🎉', title: 'Első megfejtés', desc: '1 titkosírást megfejtettél.' },
  { id: 'solved_5', emoji: '📚', title: '5 megfejtés', desc: '5 titkosírást megfejtettél.' },
  { id: 'solved_10', emoji: '🎯', title: '10 megfejtés', desc: '10 titkosírást megfejtettél.' },
  { id: 'solved_20', emoji: '🦉', title: '20 megfejtés', desc: '20 titkosírást megfejtettél.' },
  { id: 'solved_50', emoji: '🏆', title: '50 megfejtés', desc: '50 titkosírást megfejtettél.' },
  { id: 'community_solve', emoji: '🤝', title: 'Közösségi', desc: 'Megfejtettél egy közösségi titkosírást.' },
  { id: 'community_5', emoji: '🧩', title: '5 közösségi', desc: '5 közösségi titkosírást megfejtettél.' },
  { id: 'community_10', emoji: '🌟', title: '10 közösségi', desc: '10 közösségi titkosírást megfejtettél.' },
  { id: 'submitted_puzzle', emoji: '✉️', title: 'Beküldő', desc: 'Beküldtél egy saját rejtvényt.' },
  { id: 'big_leagues', emoji: '🏟️', title: 'A nagy ligák', desc: 'A közösségi rejtvényed bekerült a napi titkosírások közé.' },
  { id: 'shared_result', emoji: '📤', title: 'Megosztó', desc: 'Megosztottad az eredményedet.' },
  // Mini keresztrejtvény és napi szókereső (a trófeák ablakában külön csoportban).
  { id: 'mini_1', emoji: '🧩', title: 'Első mini', desc: '1 mini keresztrejtvényt megfejtettél.', game: 'mini' },
  { id: 'mini_5', emoji: '🗝️', title: '5 mini', desc: '5 mini keresztrejtvényt megfejtettél.', game: 'mini' },
  { id: 'mini_10', emoji: '🏅', title: '10 mini', desc: '10 mini keresztrejtvényt megfejtettél.', game: 'mini' },
  { id: 'szo_50', emoji: '🔤', title: '50 szó', desc: '50 szót megtaláltál a szókeresőben.', game: 'szo' },
  { id: 'szo_100', emoji: '📖', title: '100 szó', desc: '100 szót megtaláltál a szókeresőben.', game: 'szo' },
  { id: 'szo_500', emoji: '🐏', title: '500 szó', desc: '500 szót megtaláltál a szókeresőben.', game: 'szo' },
];

// Összes megfejtés: a napi titkosírások (aznap) és a korábbiak utólagos megfejtései.
export function solvedTotal(stats) {
  return (stats.totalSolved || 0) + (stats.archiveSolved || 0);
}
// Közösségi megfejtések száma (a szerver adja; régi kliensnél legalább 1, ha volt).
export function communityTotal(stats) {
  return Math.max(stats.communitySolvedCount || 0, stats.communitySolved ? 1 : 0);
}

// A számszerű, még meg nem szerzett trófeák haladása: [jelenlegi, cél].
export function achievementProgress(stats) {
  const streak = Math.max(stats.streak || 0, stats.best || 0);
  const solved = solvedTotal(stats);
  const community = communityTotal(stats);
  return {
    streak_3: [streak, 3], streak_5: [streak, 5], streak_10: [streak, 10], streak_20: [streak, 20],
    solved_1: [solved, 1], solved_5: [solved, 5], solved_10: [solved, 10], solved_20: [solved, 20], solved_50: [solved, 50],
    community_solve: [community, 1], community_5: [community, 5], community_10: [community, 10],
    mini_1: [stats.miniSolved || 0, 1], mini_5: [stats.miniSolved || 0, 5], mini_10: [stats.miniSolved || 0, 10],
    szo_50: [stats.szoWords || 0, 50], szo_100: [stats.szoWords || 0, 100], szo_500: [stats.szoWords || 0, 500],
  };
}

// A haladásból számolt trófea-statisztikák (minden hívó ugyanígy adja át).
export function statsFromProgress(prog, facts = {}) {
  return {
    totalSolved: prog.totalSolved || 0,
    archiveSolved: (prog.archiveSolved || []).length,
    streak: prog.streak || 0,
    best: prog.best || 0,
    fastestTime: prog.fastestTime,
    noHintSolves: prog.noHintSolves || 0,
    submittedPuzzle: prog.submittedPuzzle || false,
    readHelp: prog.readHelp || false,
    introDone: prog.introDone || false,
    tutorialDone: prog.tutorialDone || false,
    sharedResult: prog.sharedResult || false,
    usedAllHints: prog.usedAllHints || false,
    miniSolved: (prog.miniWeeks || []).length,
    szoWords: prog.szoWords || 0,
    communitySolved: !!facts.communitySolved,
    communitySolvedCount: facts.communitySolvedCount || 0,
    bigLeagues: !!facts.bigLeagues,
  };
}

// A trófea melyik játékhoz tartozik (a trófeák ablakának szűrőjéhez).
export const gameOf = (a) => a.game || 'titkos';

export function computeNewAchievements(stats, prevUnlocked) {
  const unlocked = new Set(prevUnlocked || []);
  const newly = [];
  function unlock(id) {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      newly.push(id);
    }
  }
  // A sorozat-trófeákhoz a legjobb sorozat is számít (így utólag is megkapja, aki már elérte).
  const streak = Math.max(stats.streak || 0, stats.best || 0);
  if (streak >= 3) unlock('streak_3');
  if (streak >= 5) unlock('streak_5');
  if (streak >= 10) unlock('streak_10');
  if (streak >= 20) unlock('streak_20');
  if (stats.fastestTime != null && stats.fastestTime <= 120000) unlock('time_120');
  if (stats.fastestTime != null && stats.fastestTime <= 60000) unlock('time_60');
  if (stats.fastestTime != null && stats.fastestTime <= 30000) unlock('time_30');
  if (stats.noHintSolves >= 1) unlock('no_hint');
  if (stats.submittedPuzzle) unlock('submitted_puzzle');
  if (stats.introDone) unlock('intro_done');
  // A megfejtésszámba a korábbi titkosírások utólagos megfejtései is beleszámítanak.
  const solved = solvedTotal(stats);
  if (solved >= 1) unlock('solved_1');
  if (solved >= 5) unlock('solved_5');
  if (solved >= 10) unlock('solved_10');
  if (solved >= 20) unlock('solved_20');
  if (solved >= 50) unlock('solved_50');
  const minis = stats.miniSolved || 0;
  if (minis >= 1) unlock('mini_1');
  if (minis >= 5) unlock('mini_5');
  if (minis >= 10) unlock('mini_10');
  const words = stats.szoWords || 0;
  if (words >= 50) unlock('szo_50');
  if (words >= 100) unlock('szo_100');
  if (words >= 500) unlock('szo_500');
  const community = communityTotal(stats);
  if (community >= 1) unlock('community_solve');
  if (community >= 5) unlock('community_5');
  if (community >= 10) unlock('community_10');
  if (stats.bigLeagues) unlock('big_leagues');
  if (stats.tutorialDone) unlock('tutorial_done');
  if (stats.sharedResult) unlock('shared_result');
  if (stats.usedAllHints) unlock('all_hints');
  return { unlocked: Array.from(unlocked), newly };
}
