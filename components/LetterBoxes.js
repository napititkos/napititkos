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

export function computeLayout(chars, width, slotWidth) {
  const chunks = buildChunks(chars);
  const nMax = Math.max(1, ...chunks.map((c) => c.idx.length));
  let side = !!slotWidth;
  let avail = side ? width - 2 * (slotWidth + SLOT_GAP) : width;
  if (side && rawTile(avail, nMax) < COMFORT) {
    side = false;
    avail = width;
  }
  const tile = Math.max(TILE_MIN, Math.min(TILE_MAX, rawTile(avail, nMax)));
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
  return { rows, tile, side };
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

  const { rows, tile, side } = computeLayout(chars, box.width, leftSlot ? box.slot : 0);

  const renderInput = (idx) => (
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
      onClick={(e) => e.target.select()}
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
