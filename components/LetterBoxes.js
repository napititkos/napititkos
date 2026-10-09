'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Elrendezési szabályok:
// - Egy szó legfeljebb LONG_WORD betűig mindig egy sorban marad; ha nem fér ki, a csempék
//   keskenyednek (TILE_MIN-ig).
// - Ennél hosszabb szót CHUNK betűnként több sorba tördelünk (pl. 44 betű: 12+12+12+8).
// - Több szó esetén a szavak külön sorba kerülhetnek, de egy szót nem vágunk ketté.
// - A bal oldali elem (Keverés gomb) a betűk bal szélén áll, a középre igazításba nem
//   számít bele. Ha miatta túl kicsik lennének a csempék, a betűk alá kerül.
const TILE_MAX = 38;
const TILE_MIN = 20;
const COMFORT = 34; // ennél kisebb csempéknél a gomb a betűk alá kerül
const GAP = 2;
const WORD_GAP = 12;
const ROW_GAP = 6;
const SLOT_GAP = 8;
const LONG_WORD = 14;
const CHUNK = 12;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function buildChunks(chars) {
  const words = [];
  let cur = [];
  chars.forEach((ch, idx) => {
    if (ch === ' ') {
      if (cur.length) words.push(cur);
      cur = [];
    } else cur.push(idx);
  });
  if (cur.length) words.push(cur);
  const chunks = [];
  for (const w of words) {
    if (w.length > LONG_WORD) {
      for (let i = 0; i < w.length; i += CHUNK) chunks.push({ idx: w.slice(i, i + CHUNK), own: true });
    } else chunks.push({ idx: w, own: false });
  }
  return chunks;
}

function rawTile(avail, n) {
  return Math.floor((avail - (n - 1) * GAP) / n);
}

// Elrendezés adott szélességre: ha a válasz (több szó esetén a szavak együtt) legfeljebb
// LONG_WORD betű, egy sorban marad, szükség esetén keskenyebb csempékkel; különben a
// szavak (a hosszú szavak CHUNK-os darabjai) csak akkor kerülnek új sorba, ha nem férnek ki.
function layoutFor(chunks, avail) {
  const letters = chunks.reduce((a, c) => a + c.idx.length, 0);
  if (chunks.length > 1 && letters <= LONG_WORD && !chunks.some((c) => c.own)) {
    const t = Math.floor((avail - (letters - chunks.length) * GAP - (chunks.length - 1) * WORD_GAP) / letters);
    if (t >= TILE_MIN) return { rows: [chunks], tile: Math.min(TILE_MAX, t), raw: t };
  }
  const nMax = Math.max(1, ...chunks.map((c) => c.idx.length));
  const raw = rawTile(avail, nMax);
  const tile = Math.max(TILE_MIN, Math.min(TILE_MAX, raw));
  const w = (c) => c.idx.length * tile + (c.idx.length - 1) * GAP;
  const rows = [];
  let row = [];
  let rowW = 0;
  for (const c of chunks) {
    if (c.own) {
      if (row.length) rows.push(row);
      rows.push([c]);
      row = [];
      rowW = 0;
      continue;
    }
    const add = (row.length ? WORD_GAP : 0) + w(c);
    if (row.length && rowW + add > avail) {
      rows.push(row);
      row = [c];
      rowW = w(c);
    } else {
      row.push(c);
      rowW += add;
    }
  }
  if (row.length) rows.push(row);
  return { rows, tile, raw };
}

export function computeLayout(chars, width, slotWidth) {
  const chunks = buildChunks(chars);
  const below = layoutFor(chunks, width);
  if (!slotWidth) return { rows: below.rows, tile: below.tile, side: false };
  // A Keverés gomb csak akkor marad a betűk mellett, ha így is elég nagyok a csempék, és
  // emiatt nem kell több sorba tördelni.
  const side = layoutFor(chunks, width - 2 * (slotWidth + SLOT_GAP));
  if (side.raw >= COMFORT && side.rows.length <= below.rows.length) return { rows: side.rows, tile: side.tile, side: true };
  return { rows: below.rows, tile: below.tile, side: false };
}

export default function LetterBoxes({ answer, value, locked, onChange, disabled, onEnter, leftSlot }) {
  const refs = useRef([]);
  const outerRef = useRef(null);
  const slotRef = useRef(null);
  const chars = Array.from(answer);
  const [box, setBox] = useState({ width: 560, slot: 0 });

  useIsoLayoutEffect(() => {
    const measure = () => {
      const width = outerRef.current?.clientWidth || 0;
      const slot = leftSlot ? slotRef.current?.offsetWidth || 0 : 0;
      if (width) setBox((b) => (b.width === width && b.slot === slot ? b : { width, slot }));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && outerRef.current) ro.observe(outerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [!!leftSlot]);

  useEffect(() => {
    if (disabled) return;
    const firstEditable = chars.findIndex((ch, idx) => ch !== ' ' && !locked[idx] && !value[idx]);
    const target = firstEditable === -1 ? chars.findIndex((ch, idx) => ch !== ' ' && !locked[idx]) : firstEditable;
    if (target !== -1 && refs.current[target]) {
      refs.current[target].focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // A natív input-eseményhez mindig a friss értékek kellenek (a figyelőt csak egyszer kötjük be).
  const latest = useRef({ value, locked, chars });
  latest.current = { value, locked, chars };

  // Ha a mezőben már ugyanaz a betű van, amit beír (pl. az 5. helyen T volt, és újra T-t üt),
  // a React onChange nem fut le, mert az érték nem változott - így nem léptetett tovább, a kurzor
  // pedig a betű mögé került, és a maxLength miatt utána semmit nem lehetett beírni. A natív
  // input-esemény viszont ilyenkor is lefut: ebből léptetünk tovább (vagy jelöljük ki újra a
  // mezőt, ha ez volt az utolsó).
  useEffect(() => {
    const root = outerRef.current;
    if (!root) return;
    const onNativeInput = (e) => {
      const el = e.target;
      const idx = Number(el?.dataset?.idx);
      if (!Number.isInteger(idx)) return;
      const { value: cur, locked: lk, chars: cs } = latest.current;
      const v = (el.value || '').toUpperCase().slice(-1);
      if (el.value.length !== 1 || !v || v !== (cur[idx] || '')) return; // a változást az onChange kezeli
      let n = idx + 1;
      while (n < cs.length && (cs[n] === ' ' || lk[n])) n++;
      if (n < cs.length && refs.current[n]) refs.current[n].focus();
      else el.select();
    };
    root.addEventListener('input', onNativeInput);
    return () => root.removeEventListener('input', onNativeInput);
  }, []);

  const { rows, tile, side } = computeLayout(chars, box.width, leftSlot ? box.slot : 0);

  const renderInput = (idx) => (
    <input
      key={idx}
      ref={(el) => (refs.current[idx] = el)}
      type="text"
      inputMode="text"
      data-idx={idx}
      aria-label={`${idx + 1}. betű`}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="characters"
      spellCheck={false}
      className={`letter-box${locked[idx] ? ' locked' : ''}`}
      disabled={disabled || locked[idx]}
      value={value[idx] || ''}
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.target.select()}
      onChange={(e) => {
        // Nincs maxLength: ha a kijelölés elveszett, és a kurzor a meglévő betű elé vagy mögé
        // került, a mezőbe két betű kerül - ilyenkor a régi betűt elhagyva az újat vesszük
        // (ugyanaz a betű kétszer = maradt a régi). Korábban a maxLength ilyenkor minden további
        // gépelést elnyelt, amíg újra bele nem kattintottak a mezőbe.
        const raw = e.target.value.toUpperCase();
        const prev = value[idx] || '';
        let v = raw.slice(-1);
        if (raw.length > 1 && prev) {
          const at = raw.indexOf(prev);
          v = (at >= 0 ? raw.slice(0, at) + raw.slice(at + 1) : raw).slice(-1) || prev;
        }
        const next = [...value];
        next[idx] = v;
        onChange(next);
        if (v) {
          const n = nextEditable(idx + 1);
          if (n < chars.length) focusIndex(n);
          // Az utolsó mezőben maradva a betű kijelölve marad, így rögtön átírható.
          else requestAnimationFrame(() => e.target.select());
        }
      }}
      onKeyDown={(e) => {
        const el = e.target;
        if (
          e.key.length === 1 &&
          !e.ctrlKey && !e.metaKey && !e.altKey &&
          value[idx] && e.key.toUpperCase() === value[idx] &&
          el.selectionStart === 0 && el.selectionEnd === el.value.length
        ) {
          // Ugyanazt a betűt üti be, ami már ott van (és ki van jelölve): nincs mit átírni, csak lépünk.
          e.preventDefault();
          const n = nextEditable(idx + 1);
          if (n < chars.length) focusIndex(n);
          else el.select();
        } else if (e.key === 'Backspace' && !value[idx]) {
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
  );

  const style = {
    '--tile': `${tile}px`,
    '--tile-font': `${Math.max(12, Math.round(tile * 0.47))}px`,
    '--tile-gap': `${GAP}px`,
    '--word-gap': `${WORD_GAP}px`,
    '--row-gap': `${ROW_GAP}px`,
  };

  return (
    <div className="lb-outer" ref={outerRef}>
      <div className="lb-inner" style={style}>
        {leftSlot && (
          <div ref={slotRef} className={side ? 'lb-slot lb-slot-side' : 'lb-slot lb-slot-below'} style={{ '--slot-gap': `${SLOT_GAP}px` }}>
            {leftSlot}
          </div>
        )}
        <div className="lb-rows">
          {rows.map((row, ri) => (
            <div className="lb-row" key={ri}>
              {row.map((c, ci) => (
                <div className="lb-word" key={ci}>
                  {c.idx.map(renderInput)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
