'use client';
import Logo from './Logo';
import Icon from './Icon';
import { MiniIcon, SzoIcon } from './GameIcons';
import { MiniWordmark, SzoWordmark, TitkosWordmark } from './Wordmark';

// A játékok alja: a játékhoz tartozó archívum és közösségi csempe (ha van), alatta a másik két
// játék csempéje.
const GAMES = {
  titkos: { href: '/titkosiras', title: 'Titkosírás', sub: 'Minden nap új kriptikus rejtvény' },
  szo: { href: '/szokereso', title: 'Szókereső', sub: 'Minden nap új!' },
  mini: { href: '/mini', title: 'Heti Mini', sub: 'Hétfőnként új keresztrejtvény!' },
};

// Játékcsempe (a főoldalon és a játékok alján): balra a játék logója, a csempét alul-felül
// kitöltve; mellette középen a játék neve a címbetűtípussal és színekkel (kos nélkül), alatta az alcím.
export function GameTile({ game, isNew = false, big = false, done = false }) {
  const g = GAMES[game];
  return (
    <a className={`card game-tile${big ? ' game-tile-big' : ''}`} href={g.href} aria-label={`${g.title} – ${g.sub}`}>
      {isNew && (
        <span className="game-tile-new" aria-hidden="true">
          ÚJ!
        </span>
      )}
      <span className="game-tile-icon">{game === 'titkos' ? <Logo size={null} className="game-tile-logo" /> : game === 'szo' ? <SzoIcon size={null} /> : <MiniIcon size={null} />}</span>
      {done && (
        <span className="game-tile-done" role="img" aria-label="Teljesítve">
          <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
            <path d="M4 12.8l5 5L20.5 6" fill="none" stroke="var(--btn-primary)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <span className="game-tile-text">
        <span className="game-tile-word">{game === 'titkos' ? <TitkosWordmark ring={false} /> : game === 'szo' ? <SzoWordmark ring={false} /> : <MiniWordmark ring={false} />}</span>
        <span className="game-tile-sub">{g.sub}</span>
      </span>
    </a>
  );
}

export default function GameFooter({ game }) {
  const tab = game === 'mini' ? '?tab=mini' : game === 'szo' ? '?tab=szo' : '';
  const others = Object.keys(GAMES).filter((k) => k !== game);
  return (
    <div className="game-footer">
      <div className="next-links">
        <a className="card next-link" href={`/archive${tab}`}>
          <Icon src="/icons/Korabbi_titkosirasok.png" size={22} />
          <b>Korábbi rejtvények</b>
          <span>{game === 'szo' ? 'A korábbi napok szókeresői' : game === 'mini' ? 'A korábbi heti minik' : 'Játszd újra a régebbi napok rejtvényeit'}</span>
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
