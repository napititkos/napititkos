'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CoachTail } from './RamNote';

// A kos üzenete, chat-szerűen: balra a kos feje (külön kör), mellette a beszédbuborék, amely
// a fejből "nyúlik ki"; alul középen az "Értem" gomb. A célelem kiemelve; amíg az üzenet
// látszik, az oldal többi része nem kattintható (kötött, lépésenkénti bemutató).
//   target: CSS-szelektor (az első találat), vagy null
//   place:  'below' | 'above' | 'side' (asztalon jobbra a cél mellé, ha elfér; különben alá) | 'bottom'
//   blink:  CSS-szelektor, amely villog (pl. a gomb, amit meg kell nyomni)
//   onOk:   ha nincs megadva, nincs gomb (a felhasználónak a kiemelt elemet kell használnia)
export default function RamCoach({ target, place = 'below', children, okLabel = 'Értem', onOk, blocking = true, blink }) {
  const [rect, setRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ w: 400, h: 800 });
  const [shownAt] = useState(() => Date.now());
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
      const el = target ? document.querySelector(target) : null;
      document.querySelectorAll('.coach-target').forEach((x) => x !== el && x.classList.remove('coach-target'));
      if (el) {
        el.classList.add('coach-target');
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height });
      } else setRect(null);
      if (blink) document.querySelectorAll(blink).forEach((x) => x.classList.add('coach-blink'));
    };
    // Először azonnal (animáció nélkül) a célhoz görgetünk, hogy az üzenet ne "csússzon" utána.
    const first = target ? document.querySelector(target) : null;
    if (first && place !== 'bottom' && place !== 'side') first.scrollIntoView({ block: 'center', behavior: 'instant' });
    measure();
    const id = setInterval(measure, 400);
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.querySelectorAll('.coach-target').forEach((x) => x.classList.remove('coach-target'));
      if (blink) document.querySelectorAll(blink).forEach((x) => x.classList.remove('coach-blink'));
    };
  }, [target, place, blink]);

  if (!mounted) return null;
  const { w: vw, h: vh } = size;
  const width = Math.min(380, vw - 20);
  let style;
  if (place === 'bottom' || !rect) {
    style = { left: (vw - width) / 2, bottom: 14, width };
  } else if (place === 'side' && vw - rect.right >= width + 28) {
    style = { left: rect.right + 16, top: Math.max(12, rect.top), width };
  } else if (place === 'side') {
    style = { left: (vw - width) / 2, top: Math.min(rect.bottom + 12, vh - 180), width };
  } else {
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(10, Math.min(vw - width - 10, centerX - width / 2));
    const below = place === 'below' ? rect.bottom + 12 + 150 < vh || rect.top < 180 : false;
    style = below ? { left, top: rect.bottom + 12, width } : { left, bottom: vh - rect.top + 12, width };
  }

  return createPortal(
    <>
      {blocking && <div className="coach-blocker" aria-hidden="true" />}
      <div className="coach-wrap" style={style} role="dialog" aria-live="polite" aria-label="A kos üzenete">
        <img className="coach-ram" src="/logo-96.png" alt="" aria-hidden="true" width={44} height={44} />
        <div className="coach-bubble">
          <CoachTail />
          <div className="coach-text">{children}</div>
          {onOk && (
            <div className="coach-actions">
              <button
                type="button"
                className="primary small"
                onClick={() => {
                  // Közvetlenül a megjelenés után érkező kattintást / Entert nem vesszük figyelembe:
                  // asztalon az Enterrel beküldött megfejtés után az üzenet különben azonnal
                  // be is zárulna, mielőtt el lehetne olvasni.
                  if (Date.now() - shownAt < 700) return;
                  onOk();
                }}
              >
                {okLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
