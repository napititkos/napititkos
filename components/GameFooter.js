'use client';
import Logo from './Logo';
import Icon from './Icon';
import { MiniIcon, SudokuIcon, SzoIcon, SzolancIcon } from './GameIcons';
import { MiniWordmark, SudokuWordmark, SzoWordmark, TitkosWordmark, SzolancWordmark } from './Wordmark';

// A játékok alja: a játékhoz tartozó archívum és közösségi csempe (ha van), alatta a másik két
// játék csempéje.
const GAMES = {
  titkos: { href: '/titkosiras', title: 'Titkosírás', sub: 'Minden nap új kriptikus rejtvény' },
  szo: { href: '/szokereso', title: 'Szókereső', sub: 'Minden nap új!' },
  szolanc: { href: '/szolanc', title: 'Szólánc', sub: 'Minden nap új!' },
  sudoku: { href: '/sudoku', title: 'Sudoku', sub: 'Minden nap új!' },
  mini: { href: '/mini', title: 'Heti Mini', sub: 'Hétfőnként új keresztrejtvény!' },
};

// Játékcsempe (a főoldalon és a játékok alján): balra a játék logója, a csempét alul-felül
// kitöltve; mellette középen a játék neve a címbetűtípussal és színekkel (kos nélkül), alatta az alcím.
// checks: több jelölődoboz (pl. sudoku 6×6 és 9×9), alattuk felirattal; mindegyik a saját rejtvényére
// visz. Ezek a csempe linkjén kívül vannak (link a linkben nem lehet), de ugyanott jelennek meg.
const CheckMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.2 12.6l3.7 3.7 7.9-8.4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export function GameTile({ game, isNew = false, big = false, done = false, href = null, checks = null }) {
  const g = GAMES[game];
  const tile = (
    <a className={`card game-tile game-tile-${game}${big ? ' game-tile-big' : ''}`} href={href || g.href} aria-label={`${g.title} – ${g.sub}`}>
      {/* A logók betűrácsai és a díszfeliratok ne kerüljenek a keresők találati szövegébe. */}
      <span className="game-tile-icon" data-nosnippet="">{game === 'titkos' ? <Logo size={null} className="game-tile-logo" /> : game === 'szo' ? <SzoIcon size={null} /> : game === 'sudoku' ? <SudokuIcon size={null} /> : game === 'szolanc' ? <SzolancIcon size={null} /> : <MiniIcon size={null} />}</span>
      {/* Főoldalon: lekerekített sarkú fekete négyzet a csempe jobb szélén; teljesítéskor benne a pipa. */}
      {big && !checks && (
        <span className={`game-tile-check${done ? ' done' : ''}`} role="img" aria-label={done ? 'Teljesítve' : 'Még nincs teljesítve'}>
          {done && <CheckMark />}
        </span>
      )}
      <span className="game-tile-text">
        <span className="game-tile-word" data-nosnippet="">{game === 'titkos' ? <TitkosWordmark ring={false} /> : game === 'szo' ? <SzoWordmark ring={false} /> : game === 'sudoku' ? <SudokuWordmark ring={false} /> : game === 'szolanc' ? <SzolancWordmark ring={false} /> : <MiniWordmark ring={false} />}</span>
        <span className="game-tile-sub">{g.sub}</span>
      </span>
    </a>
  );
  if (!big || !checks) return tile;
  return (
    <div className="game-tile-wrap">
      {tile}
      <div className="game-tile-checks">
        {checks.map((c) => (
          <span key={c.label} className="game-tile-check-item">
            <span className={`game-tile-check${c.done ? ' done' : ''}`} role="img" aria-label={`${c.label}: ${c.done ? 'teljesítve' : 'még nincs teljesítve'}`}>
              {c.done && <CheckMark />}
            </span>
            {/* A szokásos buborék maga a gomb (a saját rejtvényére visz). */}
            <a className="pill game-tile-check-label" href={c.href} aria-label={`${g.title} ${c.label}`}>
              {c.label}
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function GameFooter({ game }) {
  const tab = game === 'mini' ? '?tab=mini' : game === 'szo' ? '?tab=szo' : game === 'sudoku' ? '?tab=sudoku' : game === 'szolanc' ? '?tab=szolanc' : '';
  const others = Object.keys(GAMES).filter((k) => k !== game);
  return (
    <div className="game-footer">
      <div className="next-links">
        <a className="card next-link" href={`/archive${tab}`}>
          <Icon src="/icons/Korabbi_titkosirasok.png" size={22} />
          <b>Korábbi rejtvények</b>
          <span>{game === 'szo' ? 'A korábbi napok szókeresői' : game === 'szolanc' ? 'A korábbi napok szóláncai' : game === 'sudoku' ? 'A korábbi napok sudokui' : game === 'mini' ? 'A korábbi heti minik' : 'Játszd újra a régebbi napok rejtvényeit'}</span>
        </a>
        <a className="card next-link" href={`/kozossegi${game === 'mini' ? '?tab=mini' : ''}`}>
          <Icon src="/icons/Kozossegi.png" size={22} />
          <b>Közösségi rejtvények</b>
          <span>{game === 'mini' ? 'Fejtsd meg a játékosok minijeit' : 'Fejtsd meg a játékosok rejtvényeit'}</span>
        </a>
      </div>
      <div className="game-tiles">
        {others.map((k) => (
          <GameTile key={k} game={k} />
        ))}
      </div>
    </div>
  );
}
