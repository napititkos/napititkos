'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CoachTail } from './RamNote';

// A kos üzenete, chat-szerűen: balra a kos feje (külön kör), mellette a beszédbuborék, amely
// a fejből "nyúlik ki"; alul középen az "Értem" gomb. A célelem kiemelve; amíg az üzenet
// látszik, az oldal többi része nem kattintható (kötött, lépésenkénti bemutató).
//   target: CSS-szelektor (az első találat), vagy null
//   place:  'below' | 'above' | 'side' (asztalon jobbra a cél mellé, ha elfér; különben alá) | 'bottom'
//   blink:  CSS-szelektor, amely villog (pl. a gomb, amit meg kell nyomni)
//   onOk:   ha nincs megadva, nincs gomb (a felhasználónak a kiemelt elemet kell használnia)
//   scroll: false esetén nem görget a célhoz (az oldal ott marad, ahol a felhasználó hagyta)
// A homályosító réteg „lyuka” a kiemelt elem körül: lekerekített téglalap, akkora ráhagyással,
// hogy a villogó gomb lüktető fénye és nagyobbodása is beleférjen (ne vágódjon le szögletesen).
function holePath(r, vw, vh) {
  // Szoros ráhagyás (a szomszédos szövegek ne lógjanak bele félig); villogó elemnél nagyobb, hogy a
  // lüktető fény is beleférjen.
  const pad = r.blink ? 13 : 6;
  const x = Math.round(r.left - pad);
  const y = Math.round(r.top - pad);
  const w = Math.round(r.width + 2 * pad);
  const h = Math.round(r.height + 2 * pad);
  const k = Math.min(20, h / 2, w / 2);
  const hole = `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`;
  return `path(evenodd, "M0 0H${vw}V${vh}H0Z ${hole}")`;
}

export default function RamCoach({ target, place = 'below', children, okLabel = 'Értem', onOk, blocking = true, blink, scroll = true }) {
  const [rect, setRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ w: 400, h: 800 });
  const [shownAt] = useState(() => Date.now());
  // A buborék mért magassága: felülről igazított helyzetben se lógjon ki a képernyő aljáról
  // (kis telefonon a hosszabb üzeneteknél az "Értem" gomb különben elérhetetlen lenne).
  const wrapRef = useRef(null);
  const [boxH, setBoxH] = useState(0);
  useLayoutEffect(() => {
    const h = wrapRef.current?.offsetHeight || 0;
    if (h && Math.abs(h - boxH) > 1) setBoxH(h);
  });
  useEffect(() => setMounted(true), []);
  const [settled, setSettled] = useState(false);
  const lockRef = useRef(null);
  // Lépésenként egyszer: ha a buborék csak görgetéssel fér el a kiemelt elem alatt, odagörgetünk.
  const scrolledFor = useRef(null);
  const pendingScroll = useRef(null);
  useEffect(() => {
    const dy = pendingScroll.current;
    if (dy == null || scrolledFor.current === target) return;
    scrolledFor.current = target;
    if (Math.abs(dy) > 4) window.scrollBy({ top: dy, behavior: 'smooth' });
  });

  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
      const el = target ? document.querySelector(target) : null;
      document.querySelectorAll('.coach-target').forEach((x) => x !== el && x.classList.remove('coach-target'));
      if (el) {
        el.classList.add('coach-target');
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, blink: !!(blink && el.matches(blink)) || el.classList.contains('coach-blink') });
      } else setRect(null);
      if (blink) document.querySelectorAll(blink).forEach((x) => x.classList.add('coach-blink'));
    };
    const cleanups = [];
    lockRef.current = null;
    // Először azonnal (animáció nélkül) a célhoz görgetünk, hogy az üzenet ne "csússzon" utána.
    const first = target ? document.querySelector(target) : null;
    if (scroll && first && place !== 'bottom' && place !== 'side') first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else if (first) {
      // Ha a kiemelt elem nem látszik egészben (pl. lejjebb van az oldalon), mindenképp odagörgetünk.
      const r = first.getBoundingClientRect();
      if (r.top < 8 || r.bottom > window.innerHeight - 8) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    measure();
    const id = setInterval(measure, 400);
    // Amíg az oldal görög (a célhoz igazítás), a kos és a homályosítás nem jelenik meg; a görgetés
    // végén egyszer dől el a buborék helye, és onnantól a célelemmel együtt mozog (nem ugrál).
    setSettled(false);
    let idle = setTimeout(() => setSettled(true), 260);
    const bump = () => {
      clearTimeout(idle);
      idle = setTimeout(() => setSettled(true), 180);
    };
    window.addEventListener('scroll', bump, true);
    cleanups.push(() => {
      clearTimeout(idle);
      window.removeEventListener('scroll', bump, true);
    });
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
      cleanups.forEach((f) => f());
    };
  }, [target, place, blink, scroll]);

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

  if (typeof style.top === 'number' && boxH) style.top = Math.max(12, Math.min(style.top, vh - boxH - 12));

  // A buborék soha ne takarja el, amiről beszél: ha a kiszámolt helyen ráesne a kiemelt elemre, a
  // képernyőn elférő helyek közül (alatta, fölötte, a képernyő alján, tetején) az elsőt választjuk,
  // amelyik nem fedi; ha egyik sem, azt, amelyik a legkevésbé.
  let wantScroll = null;
  if (rect && boxH && place !== 'bottom') {
    const left = typeof style.left === 'number' ? style.left : (vw - width) / 2;
    const topOf = (st) => (typeof st.top === 'number' ? st.top : vh - st.bottom - boxH);
    const pad = 6;
    const overlap = (t) => {
      const x = Math.max(0, Math.min(left + width, rect.right + pad) - Math.max(left, rect.left - pad));
      const y = Math.max(0, Math.min(t + boxH, rect.bottom + pad) - Math.max(t, rect.top - pad));
      return x * y;
    };
    const fits = (t) => t >= 8 && t + boxH <= vh - 8;
    if (overlap(topOf(style)) > 0 || !fits(topOf(style))) {
      const cands = [rect.bottom + 12, rect.top - 12 - boxH, vh - boxH - 14, 12].filter(fits);
      let best = cands.find((t) => overlap(t) === 0) ?? cands.sort((a, b) => overlap(a) - overlap(b))[0];
      if (best != null) style = { left, top: best, width };
      // Széles képernyőn a kiemelt elem mellé (jobbra vagy balra), ha ott elfér.
      if ((best == null || overlap(best) > 0) && boxH) {
        const sideTop = Math.max(12, Math.min(rect.top, vh - boxH - 12));
        if (vw - rect.right >= width + 28) {
          style = { left: rect.right + 16, top: sideTop, width };
          best = -1;
        } else if (rect.left >= width + 28) {
          style = { left: rect.left - width - 16, top: sideTop, width };
          best = -1;
        }
      }
      // Ha így is fedné, de a kiemelt elem és a buborék egymás alatt elfér a képernyőn, az oldalt
      // úgy görgetjük, hogy a kiemelt elem felülre kerüljön, a buborék pedig alá.
      if (best !== -1 && (best == null || overlap(best) > 0)) {
        if (rect.height + boxH + 40 <= vh) wantScroll = rect.top - 14;
      }
    }
  }

  pendingScroll.current = wantScroll;
  // Helyzet rögzítése: a görgetés végén kiszámolt helyhez képest a buborék a célelemmel együtt mozog.
  if (settled && rect && place !== 'bottom' && typeof style.top === 'number') {
    if (!lockRef.current) lockRef.current = { left: style.left, dy: style.top - rect.top, width: style.width };
    const L = lockRef.current;
    style = { left: L.left, top: Math.max(8, Math.min(vh - (boxH || 0) - 8, rect.top + L.dy)), width: L.width };
  }
  // Egész képpontokra kerekítve: tört képpontos helyzetben a buborék kerete és a nyúlvány
  // élsimítása eltér, és a nyúlvány előtt halvány vonal látszik.
  style = Object.fromEntries(Object.entries(style).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]));
  return createPortal(
    <>
      {/* Ha van kiemelt elem, a környezete elhomályosul (a kiemelt rész lyukként tiszta marad). */}
      {(blocking || rect) && (
        <div
          className={`coach-blocker${rect && settled ? ' spot' : ''}${blocking ? '' : ' free'}`}
          aria-hidden="true"
          style={rect && settled ? { clipPath: holePath(rect, vw, vh) } : undefined}
        />
      )}
      <div className="coach-wrap" ref={wrapRef} style={{ ...style, visibility: settled ? 'visible' : 'hidden' }} role="dialog" aria-live="polite" aria-label="A kos üzenete">
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
