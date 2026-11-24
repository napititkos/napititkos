// Megfejtés után: ha a játékos a napi (miniknél heti) ranglistán a legjobb 3 között van, és már
// legalább 5 megfejtés van, a tábla-animáció (hullám) végén a ranglista azonnal felúszik. A
// ranglista ablak már a hullám alatt betölti az eredményeket (így a hullám végén nincs várakozás),
// és ő dönti el, hogy teljesül-e a feltétel (ha nem, nem nyílik meg semmi).
export function openLeaderboardIfTop(tab, size = 6) {
  if (typeof window === 'undefined') return;
  const openAt = window.__winWaveUntil || Date.now();
  window.dispatchEvent(new CustomEvent('open-leaderboard', { detail: { tab, size, auto: true, openAt } }));
}
