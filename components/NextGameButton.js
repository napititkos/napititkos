'use client';
import { loadProgress } from '../lib/progress';
import { nextGameHref } from '../lib/dailyDone';

// „Következő játék”: a főoldal sorrendjében (Titkosírás, Szókereső, Sudoku 6×6, Sudoku 9×9, Heti Mini)
// az első még nem teljesített napi játékra visz, a mostanit kihagyva. Ha minden kész, a főoldalra.
// A célt kattintáskor számoljuk, így a frissen teljesített játék már beleszámít.
export default function NextGameButton({ current }) {
  function go() {
    window.location.href = nextGameHref(loadProgress(), current);
  }
  return (
    <div className="result-action">
      <button type="button" className="primary round-btn" onClick={go} aria-label="Következő játék">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span>Következő játék</span>
    </div>
  );
}
