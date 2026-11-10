'use client';
import Logo from './Logo';
import { MiniIcon, SzoIcon } from './GameIcons';

// A játékok alja: a játékhoz tartozó archívum és közösségi csempe (ha van), alatta a másik két
// játék csempéje.
const GAMES = {
  titkos: { href: '/titkosiras', title: 'Titkosírás', sub: 'Minden nap új!' },
  szo: { href: '/szokereso', title: 'Napi szókereső', sub: 'Minden nap új!' },
  mini: { href: '/mini', title: 'Mini keresztrejtvény', sub: 'Minden héten új!' },
};

export function GameTile({ game, isNew = false }) {
  const g = GAMES[game];
  return (
    <a className="card game-tile" href={g.href}>
      {isNew && (
        <span className="game-tile-new" aria-label="Új játék">
          ÚJ!
        </span>
      )}
      <span className="game-tile-icon">
        {game === 'titkos' ? <Logo size={56} /> : game === 'szo' ? <SzoIcon size={56} /> : <MiniIcon size={56} />}
      </span>
      <span className="game-tile-text">
        <b>{g.title}</b>
        <span>{g.sub}</span>
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
          <b>Korábbi rejtvények</b>
          <span>{game === 'szo' ? 'A korábbi napok szókeresői' : game === 'mini' ? 'A korábbi heti minik' : 'A korábbi titkosírások'}</span>
        </a>
        {game !== 'szo' && (
          <a className="card next-link" href={`/kozossegi${tab}`}>
            <b>Közösségi rejtvények</b>
            <span>{game === 'mini' ? 'A játékosok minijei' : 'A játékosok titkosírásai'}</span>
          </a>
        )}
      </div>
      <div className="game-tiles">
        {others.map((k) => (
          <GameTile key={k} game={k} />
        ))}
      </div>
    </div>
  );
}
