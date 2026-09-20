'use client';
import { useRef } from 'react';

export default function LetterBoxes({ answer, value, locked, onChange, disabled, onEnter }) {
  const refs = useRef([]);
  const chars = Array.from(answer);

  function focusIndex(idx) {
    const el = refs.current[idx];
    if (el) el.focus();
  }
  function nextEditable(from) {
    let n = from;
    while (n < chars.length && (chars[n] === ' ' || locked[n])) n++;
    return n;
  }
  function prevEditable(from) {
    let p = from;
    while (p >= 0 && (chars[p] === ' ' || locked[p])) p--;
    return p;
  }

  return (
    <div className="letterbox-row">
      {chars.map((ch, idx) =>
        ch === ' ' ? (
          <div key={idx} style={{ width: 12, flex: '0 0 auto' }} />
        ) : (
          <input
            key={idx}
            ref={(el) => (refs.current[idx] = el)}
            type="text"
            inputMode="text"
            maxLength={1}
            className={`letter-box${locked[idx] ? ' locked' : ''}`}
            disabled={disabled || locked[idx]}
            value={value[idx] || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const v = e.target.value.toUpperCase().slice(-1);
              const next = [...value];
              next[idx] = v;
              onChange(next);
              if (v) {
                const n = nextEditable(idx + 1);
                if (n < chars.length) focusIndex(n);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !value[idx]) {
                const p = prevEditable(idx - 1);
                if (p >= 0) focusIndex(p);
              } else if (e.key === 'Enter') {
                onEnter && onEnter();
              } else if (e.key === 'ArrowLeft') {
                const p = prevEditable(idx - 1);
                if (p >= 0) focusIndex(p);
              } else if (e.key === 'ArrowRight') {
                const n = nextEditable(idx + 1);
                if (n < chars.length) focusIndex(n);
              }
            }}
          />
        )
      )}
    </div>
  );
}
