'use client';
import Logo from './Logo';
import Icon from './Icon';
import { MiniIcon, SudokuIcon, SzoIcon } from './GameIcons';
import { MiniWordmark, SudokuWordmark, SzoWordmark, TitkosWordmark } from './Wordmark';

// A játékok alja: a játékhoz tartozó archívum és közösségi csempe (ha van), alatta a másik két
// játék csempéje.
const GAMES = {
  titkos: { href: '/titkosiras', title: 'Titkosírás', sub: 'Minden nap új kriptikus rejtvény' },
  szo: { href: '/szokereso', title: 'Szókereső', sub: 'Minden nap új!' },
  sudoku: { href: '/sudoku', title: 'Sudoku', sub: 'Minden nap új!' },
  mini: { href: '/mini', title: 'Heti Mini', sub: 'Hétfőnként új keresztrejtvény!' },
};

// Játékcsempe (a főoldalon és a játékok alján): balra a játék logója, a csempét alul-felül
// kitöltve; mellette középen a játék neve a címbetűtípussal és színekkel (kos nélkül), alatta az alcím.
export function GameTile({ game, isNew = false, big = false, done = false }) {
  const g = GAMES[game];
  return (
    <a className={`card game-tile${big ? ' game-tile-big' : ''}`} href={g.href} aria-label={`${g.title} – ${g.sub}`}>
      <span className="game-tile-icon">{game === 'titkos' ? <Logo size={null} className="game-tile-logo" /> : game === 'szo' ? <SzoIcon size={null} /> : game === 'sudoku' ? <SudokuIcon size={null} /> : <MiniIcon size={null} />}</span>
      {/* Főoldalon: lekerekített sarkú fekete négyzet a csempe jobb szélén; teljesítéskor benne a pipa. */}
      {big && (
        <span className={`game-tile-check${done ? ' done' : ''}`} role="img" aria-label={done ? 'Teljesítve' : 'Még nincs teljesítve'}>
          {done && (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.2 12.6l3.7 3.7 7.9-8.4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      )}
      <span className="game-tile-text">
        <span className="game-tile-word">{game === 'titkos' ? <TitkosWordmark ring={false} /> : game === 'szo' ? <SzoWordmark ring={false} /> : game === 'sudoku' ? <SudokuWordmark ring={false} /> : <MiniWordmark ring={false} />}</span>
        <span className="game-tile-sub">{g.sub}</span>
      </span>
    </a>
  );
}

export default function GameFooter({ game }) {
  const tab = game === 'mini' ? '?tab=mini' : game === 'szo' ? '?tab=szo' : game === 'sudoku' ? '?tab=sudoku' : '';
  const others = Object.keys(GAMES).filter((k) => k !== game);
  return (
    <div className="game-footer">
      <div className="next-links">
        <a className="card next-link" href={`/archive${tab}`}>
          <Icon src="/icons/Korabbi_titkosirasok.png" size={22} />
          <b>Korábbi rejtvények</b>
          <span>{game === 'szo' ? 'A korábbi napok szókeresői' : game === 'sudoku' ? 'A korábbi napok sudokui' : game === 'mini' ? 'A korábbi heti minik' : 'Játszd újra a régebbi napok rejtvényeit'}</span>
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
