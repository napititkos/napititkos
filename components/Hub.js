import { GameTile } from './GameFooter';

// Főoldal élesítés után: csak a három játék csempéje (a fejlécben a Napititkos logó és a profil
// gomb).
export default function Hub() {
  return (
    <div className="hub">
      <GameTile game="titkos" />
      <GameTile game="szo" isNew />
      <GameTile game="mini" isNew />
    </div>
  );
}
