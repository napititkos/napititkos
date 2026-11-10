'use client';
import { useEffect, useRef, useState } from 'react';

// Lapozó: ‹ Előző · 1 … 4 5 [6] 7 8 … 40 · Következő ›. Annyi szomszédos oldalszám látszik,
// amennyi a rendelkezésre álló szélességben elfér (mobilon kevesebb, asztalon több).
export { pageWindow } from './pagerWindow.js';
import { pageWindow } from './pagerWindow.js';

export default function Pager({ page, pages, onPage, disabled = false, info }) {
  const ref = useRef(null);
  const [slots, setSlots] = useState(7);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      // kb. 33-38 px oldalszámonként, az Előző/Következő gombok helyével csökkentve (keskeny
      // kijelzőn a gombokon csak a nyíl látszik)
      const narrow = el.clientWidth < 480;
      const w = el.clientWidth - 2 * (narrow ? 42 : 96);
      setSlots(Math.max(5, Math.min(15, Math.floor(w / (narrow ? 33 : 38)))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (pages <= 1) return info ? <div className="pager-info mini-muted">{info}</div> : null;
  const items = pageWindow(page, pages, slots);
  return (
    <nav className="pager" ref={ref} aria-label="Lapozás">
      <div className="pager-row">
        <button type="button" className="ghost small" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} aria-label="Előző oldal">
          <span aria-hidden="true">‹</span>
          <span className="pager-label"> Előző</span>
        </button>
        <span className="pager-pages">
          {items.map((it) =>
            typeof it === 'string' ? (
              <span key={it} className="pager-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button key={it} type="button" className={`pager-num${it === page ? ' on' : ''}`} aria-current={it === page ? 'page' : undefined} disabled={disabled} onClick={() => it !== page && onPage(it)}>
                {it}
              </button>
            )
          )}
        </span>
        <button type="button" className="ghost small" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)} aria-label="Következő oldal">
          <span className="pager-label">Következő </span>
          <span aria-hidden="true">›</span>
        </button>
      </div>
      {info && <div className="pager-info mini-muted">{info}</div>}
    </nav>
  );
}
