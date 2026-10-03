'use client';
import { clueTokens, HL_LABELS } from '../lib/clue';

// Szókijelölő egy kiemelhető tipphez: a rejtvény szavai gombokként, kattintással
// jelölhető ki, melyiket emelje ki a tipp (a tipp saját színével).
export default function HintWordPicker({ clue, type, words = [], onChange }) {
  const tokens = clueTokens(clue).filter((t) => t.w >= 0);
  return (
    <div className={`hl-type-${type}`} style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
        <span className="hl-dot" />
        Jelöld ki a rejtvény azon szavait, amelyeket a(z) {HL_LABELS[type].toLowerCase()} tipp kiemel:
      </div>
      <div className="word-chips">
        {tokens.map((tok) => {
          const on = words.includes(tok.w);
          return (
            <button
              type="button"
              key={tok.w}
              className={`word-chip${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange(on ? words.filter((x) => x !== tok.w) : [...words, tok.w].sort((a, b) => a - b))}
            >
              {tok.t}
            </button>
          );
        })}
        {!tokens.length && <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Előbb írd be a rejtvény szövegét.</span>}
      </div>
    </div>
  );
}
