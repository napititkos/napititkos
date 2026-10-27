'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// A kos (a logó) üzenete egy elemre mutatva: buborék a logóval, "Rendben" gombbal. Amíg látszik,
// az oldal többi része nem kattintható (kötött, lépésenkénti bemutató), a célelem pedig kiemelt.
//   target: CSS-szelektor (az első találat), vagy null (a képernyő alján jelenik meg)
//   place:  'below' | 'above' | 'bottom' (a képernyő alján)
export default function RamCoach({ target, place = 'below', children, okLabel = 'Rendben', onOk, blocking = true }) {
  const [rect, setRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    let el = null;
    let raf = 0;
    const measure = () => {
      el = target ? document.querySelector(target) : null;
      if (el) {
        el.classList.add('coach-target');
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    };
    measure();
    // A cél (pl. a tipp-ablak) kicsit később jelenhet meg, és görgetéskor is követjük.
    const id = setInterval(measure, 250);
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    if (target) {
      const first = document.querySelector(target);
      if (first && place !== 'bottom') first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.querySelectorAll('.coach-target').forEach((x) => x.classList.remove('coach-target'));
    };
  }, [target, place]);

  if (!mounted) return null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const width = Math.min(340, vw - 24);
  let style;
  let arrow = null;
  if (place === 'bottom' || !rect) {
    style = { left: (vw - width) / 2, bottom: 16, width };
  } else {
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(12, Math.min(vw - width - 12, centerX - width / 2));
    const below = place === 'below' ? rect.bottom + 14 + 170 < vh || rect.top < 200 : false;
    style = below ? { left, top: rect.bottom + 14, width } : { left, bottom: vh - rect.top + 14, width };
    arrow = { side: below ? 'top' : 'bottom', x: Math.max(18, Math.min(width - 18, centerX - left)) };
  }

  return createPortal(
    <>
      {blocking && <div className="coach-blocker" aria-hidden="true" />}
      <div className="coach-bubble" style={style} role="dialog" aria-live="polite" aria-label="A kos üzenete">
        {arrow && <span className={`coach-arrow ${arrow.side}`} style={{ left: arrow.x }} aria-hidden="true" />}
        <img className="coach-ram" src="/logo-96.png" alt="" aria-hidden="true" width={46} height={46} />
        <div className="coach-text">
          {children}
          <div className="coach-actions">
            <button type="button" className="primary small" onClick={onOk} autoFocus>
              {okLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
