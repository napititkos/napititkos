'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { orderedEmojis } from '../lib/emojis';
import EmojiPicker from './EmojiPicker';
import EmojiGlyph from './EmojiGlyph';

// Egységes emoji-reakció sor (napi titkosírások, korábbi titkosírások, közösségi titkosírások).
// - A keretes gombban csak az emoji van, a darabszám alatta, a kereten kívül; a 0 nem látszik.
// - Amíg nincs saját reakció (vagy a sajátra koppintva újraválasztanál), a teljes sor látszik;
//   utána csak azok, amelyekre már valaki reagált, a saját kiemelve.
// - Az első megjelenéskor és újraválasztáskor ugyanaz a felbukkanó animáció.
// - A szülő azonnal (optimistán) frissíti a számokat: az onReact szinkron hívódik, a mentés a
//   háttérben fut.
// - Az emoji nem jelölhető ki, nem másolható; a túl új emojik képként jelennek meg.
export { EmojiGlyph };

// Ha az emojik több sorba törnek, egyenletesen oszlanak el (pl. 6 + 5, nem 10 + 1): a sor
// szélességét annyira korlátozzuk, hogy soronként egyforma számú (legfeljebb eggyel eltérő) férjen el.
function useBalancedRows(deps) {
  const ref = useRef(null);
  const [maxW, setMaxW] = useState(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row || !row.parentElement) return;
    const measure = () => {
      const items = [...row.children];
      if (!items.length) return;
      const avail = row.parentElement.clientWidth;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const itemW = Math.max(...items.map((el) => el.offsetWidth));
      const perRowMax = Math.max(1, Math.floor((avail + gap) / (itemW + gap)));
      const rows = Math.ceil(items.length / perRowMax);
      if (rows <= 1) {
        setMaxW(null);
        return;
      }
      const per = Math.ceil(items.length / rows);
      setMaxW(Math.ceil(per * itemW + (per - 1) * gap) + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row.parentElement);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [ref, maxW ? { maxWidth: maxW, marginLeft: 'auto', marginRight: 'auto' } : undefined];
}

export default function ReactionBar({ presets, counts, mine, interactive = true, disabled = false, onReact }) {
  const [pickOpen, setPickOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const showPicker = interactive && (mine == null || pickOpen);
  const all = orderedEmojis(counts).filter((e) => presets.includes(e) || (counts[e] || 0) > 0 || e === mine);
  const used = all.filter((e) => (counts[e] || 0) > 0);
  const visible = showPicker ? all.length + 1 : used.length;
  const [rowRef, rowStyle] = useBalancedRows([showPicker, visible]);

  useEffect(() => {
    if (!(interactive && mine == null)) return;
    setIntro(true);
    const t = setTimeout(() => setIntro(false), 900);
    return () => clearTimeout(t);
    // Csak a sor első megjelenésekor (vagy amikor reagálhatóvá válik) fusson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  const n = (e) => counts[e] || 0;
  const count = (e) => (
    <span className={`reaction-count${n(e) ? '' : ' zero'}`} aria-hidden="true">
      {n(e)}
    </span>
  );
  const badge = (e) => (
    <span key={e} className="reaction-item">
      <span className="reaction-btn reaction-static" aria-label={`${e} reakció, ${n(e)} darab`} role="img">
        <EmojiGlyph e={e} />
      </span>
      {count(e)}
    </span>
  );
  const choose = (e) => {
    if (mine !== e) onReact(e);
    setPickOpen(false);
    setIntro(false);
    setFullOpen(false);
  };

  if (showPicker) {
    return (
      <>
        <div ref={rowRef} style={rowStyle} className={`reaction-row reaction-stacked${pickOpen || intro ? ' reaction-row-open' : ''}`} role="group" aria-label="Reakció választása">
          {all.map((e, i) => (
            <span key={e} className="reaction-item" style={{ '--i': i }}>
              <button
                type="button"
                className={`reaction-btn${mine === e ? ' on' : ''}`}
                aria-label={`${e} reakció, ${n(e)} darab`}
                aria-pressed={mine === e}
                disabled={disabled}
                onClick={() => choose(e)}
              >
                <EmojiGlyph e={e} />
              </button>
              {count(e)}
            </span>
          ))}
          {/* A teljes emojikészlet: keret nélküli, eltérő kinézetű gomb a sor végén. */}
          <span className="reaction-item" style={{ '--i': all.length }}>
            <button
              type="button"
              className="reaction-btn reaction-more"
              aria-label="További emojik"
              title="További emojik"
              disabled={disabled}
              onClick={() => setFullOpen(true)}
            >
              <span aria-hidden="true">+</span>
            </button>
            <span className="reaction-count zero" aria-hidden="true">
              0
            </span>
          </span>
        </div>
        {fullOpen && <EmojiPicker onPick={choose} onClose={() => setFullOpen(false)} />}
      </>
    );
  }

  if (!used.length) return null;
  return (
    <div ref={rowRef} style={rowStyle} className="reaction-row reaction-stacked" role="group" aria-label="Reakciók">
      {used.map((e) =>
        interactive && mine === e ? (
          <span key={e} className="reaction-item">
            <button
              type="button"
              className="reaction-btn on mine"
              aria-label={`A te reakciód: ${e}, összesen ${n(e)}. Koppints a módosításhoz.`}
              title="A te reakciód - kattints a módosításhoz"
              onClick={() => setPickOpen(true)}
            >
              <EmojiGlyph e={e} />
            </button>
            {count(e)}
          </span>
        ) : (
          badge(e)
        )
      )}
    </div>
  );
}

// Optimista darabszám-frissítés: a régi saját reakció -1, az új +1.
export function applyReaction(counts, prevMine, next) {
  const out = { ...counts };
  if (prevMine != null) out[prevMine] = Math.max(0, (out[prevMine] || 0) - 1);
  if (next != null) out[next] = (out[next] || 0) + 1;
  return out;
}
