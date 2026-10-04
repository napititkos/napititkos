'use client';
import Icon from './Icon';

// A rejtvény alatti gombsor: Keverés | Ellenőrzés | Tippek (x/y). Az Ellenőrzés pontosan
// középen van; mindhárom gomb azonos színű és magasságú, a szélességük a felirathoz igazodik.
// Amíg a sor nincs kitöltve, a Keverés és az Ellenőrzés halványabb, megnyomva üzenetet ad.
export default function PlayActions({ rowFull, onShuffle, onCheck, onOpenHints, hintsUsed, hintsTotal, notify }) {
  return (
    <div className="play-actions">
      <div className="pa-left">
        <button
          className="primary play-btn"
          aria-disabled={!rowFull}
          onClick={() => (rowFull ? onShuffle() : notify('Töltsd ki a megoldást, hogy tudd keverni a betűket anagrammákat keresve!'))}
          title="A beírt betűk véletlenszerű összekeverése"
          aria-label="Keverés"
        >
          <Icon src="/icons/Rejtveny_Keveres.png" size={16} className="icon-on-accent" />
          <span className="keveres-label">Keverés</span>
        </button>
      </div>
      <button
        className="primary play-btn"
        aria-disabled={!rowFull}
        onClick={() => (rowFull ? onCheck() : notify('Töltsd ki előbb, vagy használj tippet, ha elakadtál!'))}
      >
        Ellenőrzés
      </button>
      <div className="pa-right">
        {hintsTotal > 0 && (
          <button className="primary play-btn" onClick={onOpenHints} aria-label={`Tippek: ${hintsUsed} felhasználva a ${hintsTotal}-ból`}>
            <Icon src="/icons/Rejtveny_tippek.png" size={16} className="icon-on-accent tips-icon" />
            <span>
              <span className="tips-label">Tippek </span>({hintsUsed}/{hintsTotal})
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
