'use client';
import { loadProgress } from '../lib/progress';
import { nextGameHref } from '../lib/dailyDone';
import { useWaveBlink } from '../lib/winWave';

// „Következő játék”: a főoldal sorrendjében (Titkosírás, Szókereső, Sudoku 6×6, Sudoku 9×9, Heti Mini)
// az első még nem teljesített napi játékra visz, a mostanit kihagyva. Ha minden kész, a közösségi
// rejtvényekhez.
// A célt kattintáskor számoljuk, így a frissen teljesített játék már beleszámít.
export default function NextGameButton({ current }) {
  // A megfejtési hullám alatt villog (mint a Kisokos kiemelése).
  const blink = useWaveBlink();
  function go() {
    window.location.href = nextGameHref(loadProgress(), current);
  }
  return (
    <div className="result-action">
      <button type="button" className={`primary round-btn${blink ? ' coach-blink' : ''}`} onClick={go} aria-label="Következő játék">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          {/* Tömzsi, vastag, lekerekített végű nyíl (a főoldali pipa stílusában). */}
          <path d="M6.5 12h10M12.4 7.4 17 12l-4.6 4.6" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span>Következő játék</span>
    </div>
  );
}
