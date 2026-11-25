'use client';
import { forwardRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Keretes ablak (ranglista, trófeák): a kijelző teljes magasságát kitölti. Fent rögzített fejléc
// (cím, bezáró X, a nem változó részek), középen keretben a görgethető tartalom, lent a lap aljára
// rögzített lábléc két gombbal: Bezárás és Játszom (az aktuális játékhoz visz; ha már azon az
// oldalon vagyunk, csak bezárja az ablakot). Váltáskor csak a középső rész töltődik újra.
// foot: saját lábléc (alapból Bezárás és Játszom).
// playLabel: a Játszom gomb felirata helyett más (pl. „Következő játék”).
const FramedModal = forwardRef(function FramedModal({ title, head, children, playHref, playLabel = null, playHrefFn = null, onClose, labelId, bodyLabel, foot = null, className = '' }, bodyRef) {
  const router = useRouter();
  const pathname = usePathname();
  function play() {
    onClose();
    const href = (playHrefFn && playHrefFn()) || playHref;
    if (!href) return;
    // Ha már a játék oldalán vagyunk, nem töltjük újra: az oldal az eseményből tudja meg, mit kell
    // mutatnia (pl. a sudoku a 9x9-est, ha a 9x9-es ranglistáról jöttünk).
    if (pathname === href.split('?')[0]) window.dispatchEvent(new CustomEvent('framed-play', { detail: { href } }));
    else router.push(href);
  }
  return (
    <div className="modal-overlay framed-overlay" onClick={onClose}>
      <div className={`modal-card has-close-tl framed-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={(e) => e.stopPropagation()}>
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
          {foot || (
            <>
              <button type="button" className="ghost" onClick={onClose}>
                Bezárás
              </button>
              <button type="button" className="primary" onClick={play}>
                {playLabel || 'Játszom'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default FramedModal;

// A játékok oldalai (a Játszom gombhoz).
export const GAME_HREF = { titkos: '/titkosiras', daily: '/titkosiras', szo: '/szokereso', szolanc: '/szolanc', sudoku: '/sudoku', mini: '/mini' };
