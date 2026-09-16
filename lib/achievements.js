export const ACHIEVEMENTS = [
  { id: 'streak_3', emoji: '🔥', title: '3 napos sorozat', desc: '3 egymást követő napon játszottál.' },
  { id: 'streak_5', emoji: '🔥', title: '5 napos sorozat', desc: '5 egymást követő napon játszottál.' },
  { id: 'streak_10', emoji: '👑', title: '10 napos sorozat', desc: '10 egymást követő napon játszottál.' },
  { id: 'time_120', emoji: '⏱️', title: '2 percen belül', desc: 'Megfejtettél egyet 2 percen belül.' },
  { id: 'time_60', emoji: '⚡', title: '1 percen belül', desc: 'Megfejtettél egyet 1 percen belül.' },
  { id: 'time_30', emoji: '🚀', title: 'Fél percen belül', desc: 'Megfejtettél egyet fél percen belül.' },
  { id: 'submitted_puzzle', emoji: '✉️', title: 'Beküldő', desc: 'Beküldtél egy saját rejtvényt.' },
  { id: 'read_help', emoji: '📖', title: 'Olvasott', desc: 'Elolvastad a Súgót.' },
  { id: 'solved_1', emoji: '🎉', title: 'Első megfejtés', desc: '1 titkosírást megfejtettél.' },
  { id: 'solved_5', emoji: '📚', title: '5 megfejtés', desc: '5 titkosírást megfejtettél.' },
  { id: 'solved_10', emoji: '🧠', title: '10 megfejtés', desc: '10 titkosírást megfejtettél.' },
  { id: 'solved_20', emoji: '🦉', title: '20 megfejtés', desc: '20 titkosírást megfejtettél.' },
];

export function computeNewAchievements(stats, prevUnlocked) {
  const unlocked = new Set(prevUnlocked || []);
  const newly = [];
  function unlock(id) {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      newly.push(id);
    }
  }
  if (stats.streak >= 3) unlock('streak_3');
  if (stats.streak >= 5) unlock('streak_5');
  if (stats.streak >= 10) unlock('streak_10');
  if (stats.fastestTime != null && stats.fastestTime <= 120000) unlock('time_120');
  if (stats.fastestTime != null && stats.fastestTime <= 60000) unlock('time_60');
  if (stats.fastestTime != null && stats.fastestTime <= 30000) unlock('time_30');
  if (stats.submittedPuzzle) unlock('submitted_puzzle');
  if (stats.readHelp) unlock('read_help');
  if (stats.totalSolved >= 1) unlock('solved_1');
  if (stats.totalSolved >= 5) unlock('solved_5');
  if (stats.totalSolved >= 10) unlock('solved_10');
  if (stats.totalSolved >= 20) unlock('solved_20');
  return { unlocked: Array.from(unlocked), newly };
}
