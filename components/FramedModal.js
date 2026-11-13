'use client';
import { forwardRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Keretes ablak (ranglista, trófeák): a kijelző teljes magasságát kitölti. Fent rögzített fejléc
// (cím, bezáró X, a nem változó részek), középen keretben a görgethető tartalom, lent a lap aljára
// rögzített lábléc két gombbal: Bezárás és Játszom (az aktuális játékhoz visz; ha már azon az
// oldalon vagyunk, csak bezárja az ablakot). Váltáskor csak a középső rész töltődik újra.
const FramedModal = forwardRef(function FramedModal({ title, head, children, playHref, onClose, labelId, bodyLabel }, bodyRef) {
  const router = useRouter();
  const pathname = usePathname();
  function play() {
    onClose();
    if (playHref && pathname !== playHref) router.push(playHref);
  }
  return (
    <div className="modal-overlay framed-overlay" onClick={onClose}>
      <div className="modal-card has-close-tl framed-modal" role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={(e) => e.stopPropagation()}>
        <div className="fm-head">
          {/* Jobb felső sarokban bezárás, egy sorban a címmel (mobilon és asztali gépen is). */}
          <button type="button" className="modal-close-tl" aria-label="Bezárás" onClick={onClose}>
            ×
          </button>
          <h2 id={labelId} className="fm-title">
            {title}
          </h2>
          {head}
        </div>
        <div className="fm-body" ref={bodyRef} tabIndex={0} aria-label={bodyLabel}>
          {children}
        </div>
        <div className="fm-foot">
          <button type="button" className="ghost" onClick={onClose}>
            Bezárás
          </button>
          <button type="button" className="primary" onClick={play}>
            Játszom
          </button>
        </div>
      </div>
    </div>
  );
});

export default FramedModal;

// A játékok oldalai (a Játszom gombhoz).
export const GAME_HREF = { titkos: '/titkosiras', daily: '/titkosiras', szo: '/szokereso', sudoku: '/sudoku', mini: '/mini' };
