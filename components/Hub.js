import { MiniIcon, SzoIcon } from './GameIcons';
import { MiniWordmark, SzoWordmark, TitkosWordmark } from './Wordmark';

// Főoldal: a három játék csempéje, egymás alatt, a megszokott tartalomszélességben. Mindegyiken
// felül középen a játék felirata (kisebb, mint a NAPITITKOS főcím), alatta a logó, alatta a
// rövid leírás. A két új játékon „ÚJ!” jelzés.
const TILES = [
  { href: '/titkosiras', label: 'Titkosírás', word: <TitkosWordmark />, icon: null, sub: 'Minden nap új kriptikus rejtvény' },
  { href: '/szokereso', label: 'Szókereső', word: <SzoWordmark />, icon: <SzoIcon size={84} />, sub: 'Minden nap új!', isNew: true },
  { href: '/mini', label: 'Heti Mini', word: <MiniWordmark />, icon: <MiniIcon size={84} />, sub: 'Hétfőnként új!', isNew: true },
];

export default function Hub() {
  return (
    <div className="wrap">
      <div className="hub">
        {TILES.map((t) => (
          <a key={t.href} className="card hub-tile" href={t.href} aria-label={`${t.label} – ${t.sub}`}>
            {t.isNew && (
              <span className="game-tile-new" aria-hidden="true">
                ÚJ!
              </span>
            )}
            <span className="hub-tile-word">{t.word}</span>
            {t.icon && <span className="hub-tile-icon">{t.icon}</span>}
            <span className="hub-tile-sub">{t.sub}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
