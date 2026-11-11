// A játékok ikonjai a főoldali és a játékok alatti csempékhez (SVG, a paletta színeivel).
// Szókereső: 3x3-as, lekerekített négyzetekből álló rács (mint a játékban) egy már meghúzott vonallal.
// Mini: 4x4-es keresztrejtvény (SOK / OKOS / KOS mindkét irányban, sötétlila fekete négyzetekkel).
export function SzoIcon({ size = 64 }) {
  const L = ['K', 'O', 'S', 'S', 'O', 'K', 'O', 'K', 'S'];
  const c = (i) => [20 + (i % 3) * 30, 20 + Math.floor(i / 3) * 30];
  const path = [0, 1, 2];
  return (
    <svg width={size || undefined} height={size || undefined} viewBox="0 0 100 100" aria-hidden="true" className="game-icon">
      <polyline points={path.map((i) => c(i).join(',')).join(' ')} fill="none" stroke="var(--btn-primary)" strokeWidth="9" strokeLinecap="round" opacity="0.75" />
      {L.map((ch, i) => (
        <g key={i}>
          <rect x={c(i)[0] - 12} y={c(i)[1] - 12} width="24" height="24" rx="5" fill={path.includes(i) ? 'var(--mini-active)' : 'var(--mini-sq)'} stroke="var(--mini-border)" strokeWidth="2" />
          <text x={c(i)[0]} y={c(i)[1] + 5.5} textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--mini-ink)" fontFamily="var(--font-baloo), sans-serif">
            {ch}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MiniIcon({ size = 64 }) {
  const G = ['SOK#', 'OKOS', 'KOS#', '#S##'];
  return (
    <svg width={size || undefined} height={size || undefined} viewBox="0 0 100 100" aria-hidden="true" className="game-icon">
      <rect x="4" y="4" width="92" height="92" rx="6" fill="var(--mini-black)" />
      {G.map((row, r) =>
        Array.from(row).map((ch, c) =>
          ch === '#' ? null : (
            <g key={`${r}-${c}`}>
              <rect x={7 + c * 22} y={7 + r * 22} width="20" height="20" fill="var(--mini-sq)" />
              <text x={17 + c * 22} y={22 + r * 22} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--mini-ink)" fontFamily="var(--font-baloo), sans-serif">
                {ch}
              </text>
            </g>
          )
        )
      )}
    </svg>
  );
}
