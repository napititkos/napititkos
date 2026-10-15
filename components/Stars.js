// Csillagok kijelzése (csak megjelenítés): pl. 4,3 -> 4 teli csillag és egy részben teli.
export function Stars({ value, size = 16 }) {
  const pct = Math.max(0, Math.min(5, value || 0)) * 20;
  return (
    <span className="stars" style={{ fontSize: size }} aria-hidden="true">
      <span className="stars-bg">★★★★★</span>
      <span className="stars-fg" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}
