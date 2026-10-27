'use client';
import { useLayoutEffect, useRef, useState } from 'react';

// Egy- (vagy lines megadásával több-) soros rejtvényszöveg: ha nem fér ki, szóhatáron vágjuk le
// "…"-tal (szó közepén soha), és a doboz széléig sem fut ki. A teljes szöveg megnyitáskor látszik.
export default function ClueLine({ text, className = '', lines = 1 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(text);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const overflows = () => {
      if (lines <= 1) return el.scrollWidth > el.clientWidth;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 22;
      return el.scrollHeight > lh * lines + 2;
    };
    const fit = () => {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      el.textContent = text;
      if (!overflows()) {
        setShown(text);
        return;
      }
      let n = words.length - 1;
      while (n > 0) {
        el.textContent = `${words.slice(0, n).join(' ')}…`;
        if (!overflows()) break;
        n -= 1;
      }
      const out = n > 0 ? `${words.slice(0, n).join(' ')}…` : `${words[0] || ''}…`;
      el.textContent = out;
      setShown(out);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines]);
  return (
    <span ref={ref} className={`clue-line${lines > 1 ? ' clue-lines' : ''} ${className}`.trim()} title={text}>
      {shown}
    </span>
  );
}
