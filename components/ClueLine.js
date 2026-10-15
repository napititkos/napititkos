'use client';
import { useLayoutEffect, useRef, useState } from 'react';

// Egysoros rejtvényszöveg: ha nem fér ki, szóhatáron vágjuk le "…"-tal (szó közepén soha),
// és a doboz széléig sem fut ki. A teljes szöveg a rejtvény megnyitásakor látszik.
export default function ClueLine({ text, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(text);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      el.textContent = text;
      if (el.scrollWidth <= el.clientWidth) {
        setShown(text);
        return;
      }
      let n = words.length - 1;
      while (n > 0) {
        el.textContent = `${words.slice(0, n).join(' ')}…`;
        if (el.scrollWidth <= el.clientWidth) break;
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
  }, [text]);
  return (
    <span ref={ref} className={`clue-line ${className}`.trim()} title={text}>
      {shown}
    </span>
  );
}
