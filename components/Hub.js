import { GameTile } from './GameFooter';

// Főoldal: a három játék egyforma csempéje, egymás alatt, a megszokott tartalomszélességben.
// A kos csak a NAPITITKOS főcímben szerepel; a csempéken balra a játék logója, mellette a neve.
export default function Hub() {
  return (
    <div className="wrap">
      <div className="hub">
        <GameTile game="titkos" big />
        <GameTile game="szo" big isNew />
        <GameTile game="mini" big isNew />
      </div>
    </div>
  );
}
