// Megfejtés után: ha a játékos a napi (miniknél heti) ranglistán a legjobb 3 között van, és már
// legalább 5 megfejtés van, a tábla-animáció (hullám) végén a ranglista magától felúszik. A
// feltételt a ranglista ablak dönti el, miután betöltötte az eredményeket (ha nem teljesül, nem
// nyílik meg semmi).
export function openLeaderboardIfTop(tab, size = 6) {
  if (typeof window === 'undefined') return;
  // A szerver a megoldást a hullám alatt rögzíti; a hullám végét a useWinWave jelzi.
  const later = () => Math.max(0, (window.__winWaveUntil || 0) - Date.now());
  setTimeout(() => {
    setTimeout(() => window.dispatchEvent(new CustomEvent('open-leaderboard', { detail: { tab, size, auto: true } })), later() + 150);
  }, 50);
}
