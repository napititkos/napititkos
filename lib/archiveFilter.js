// Korábbi rejtvények: a fejlécben választható szűrők (Állapot, Nehézség) alkalmazása egy listára.
//   status: 'all' | 'solved' | 'unsolved'; level: 'all' | '1'…'5'
export function applyArchiveFilter(list, { status = 'all', level = 'all' } = {}, { isSolved, levelOf }) {
  return (list || []).filter((it) => {
    if (status === 'solved' && !isSolved(it)) return false;
    if (status === 'unsolved' && isSolved(it)) return false;
    if (level !== 'all' && String(levelOf(it) || '') !== String(level)) return false;
    return true;
  });
}
export const filterEmptyText = (status, level) =>
  status === 'solved' && level === 'all' ? 'Még nincs megfejtett korábbi rejtvényed ebben a játékban.' : status === 'unsolved' && level === 'all' ? 'Minden korábbi rejtvényt megfejtettél - szép munka!' : 'Nincs a szűrésnek megfelelő korábbi rejtvény.';
