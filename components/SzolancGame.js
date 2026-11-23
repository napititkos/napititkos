'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameHead from './GameHead';
import CopyResultButton from './CopyResultButton';
import { fireConfetti } from './Confetti';
import { useWinWave, diagFromBottomLeft } from '../lib/winWave';
import { isWord, oneLetterApart, shortestPath } from '../lib/szolanc';

// Szólánc (prototípus): a kezdőszóból a célszóba kell eljutni; minden lépésben pontosan egy betű
// változik (a helye marad), és minden közbülső alak létező szó (ragozott alak is lehet).
// Kezelés: a legutóbbi szóban kiválasztod a cserélendő betűt (koppintás, gépen 1–4 vagy a nyilak),
// majd a saját billentyűzeten (gépen a billentyűzeten) beírod az újat; ha létező szó, a lánc nő.
//   data: { date, number, level, start, end, par, paths }
//   preview: Kisokos (nincs mentés)
const KEY = 'titkositas_szolanc_v1';
const KEYBOARD = [
  ['ö', 'ü', 'ó', 'ő', 'ú', 'ű', 'é', 'á', 'í'],
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['y', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const LETTERS = new Set(KEYBOARD.flat());
const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const loadAll = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

export default function SzolancGame({ data, preview = false, onSolved }) {
  const { date, start, end, par, paths, level, number } = data;
  const saved = useMemo(() => (preview ? {} : loadAll()[date] || {}), [date, preview]);
  const [chain, setChain] = useState(() => (Array.isArray(saved.chain) && saved.chain[0] === start ? saved.chain : [start]));
  const [pos, setPos] = useState(-1);
  const [msg, setMsg] = useState(null);
  const [shake, setShake] = useState(false);
  const solved = chain[chain.length - 1] === end;
  const [elapsed, setElapsed] = useState(saved.elapsed || 0);
  const startRef = useRef(Date.now() - (saved.elapsed || 0));
  const [wave, playWave] = useWinWave();
  const last = chain[chain.length - 1];

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(t);
  }, [solved]);
  useEffect(() => {
    if (preview) return;
    try {
      const all = loadAll();
      all[date] = { chain, elapsed, solved };
      const keys = Object.keys(all).sort();
      while (keys.length > 60) delete all[keys.shift()];
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  }, [chain, elapsed, solved, date, preview]);

  const flash = (text, kind = 'bad') => {
    setMsg({ text, kind });
    if (kind === 'bad') {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const put = useCallback(
    (letter) => {
      if (solved) return;
      if (pos < 0) return flash('Előbb válaszd ki, melyik betűt cseréled (koppints rá).', 'info');
      if (last[pos] === letter) return;
      const next = last.slice(0, pos) + letter + last.slice(pos + 1);
      if (chain.includes(next)) return flash('Ez a szó már szerepel a láncban.');
      if (!isWord(next) || !oneLetterApart(last, next)) return flash(`„${next.toUpperCase()}” nincs a szótárunkban.`);
      const nc = [...chain, next];
      setChain(nc);
      setMsg(null);
      if (next === end) {
        const el = Date.now() - startRef.current;
        setElapsed(el);
        setPos(-1);
        playWave(nc.length + 4);
        fireConfetti();
        onSolved && onSolved({ steps: nc.length - 1, elapsed: el, chain: nc });
      }
    },
    [solved, pos, last, chain, end, playWave, onSolved]
  );
  const undo = useCallback(() => {
    if (solved || chain.length < 2) return;
    setChain((c) => c.slice(0, -1));
    setMsg(null);
  }, [solved, chain.length]);

  // Gépi billentyűzet: betűk, Backspace (Vissza), 1–4 és nyilak (a cserélendő betű kiválasztása).
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('.modal-overlay') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (/^[1-4]$/.test(k)) return setPos(Number(k) - 1);
      if (k === 'arrowleft') return setPos((p) => (p <= 0 ? 0 : p - 1));
      if (k === 'arrowright') return setPos((p) => (p < 0 ? 0 : Math.min(3, p + 1)));
      if (k === 'backspace') {
        e.preventDefault();
        return undo();
      }
      if (LETTERS.has(k)) {
        e.preventDefault();
        put(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [put, undo]);

  const best = useMemo(() => (solved ? shortestPath(start, end) : []), [solved, start, end]);
  const steps = chain.length - 1;
  const rows = [...chain, ...(solved ? [] : [end])];
  const dayLabel = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="szolanc">
      {!preview && <GameHead title="Napi Szólánc" number={number} level={level} dateLabel={dayLabel} time={fmt(elapsed)} />}
      <p className="szl-goal">
        <b>{start.toUpperCase()}</b> → <b>{end.toUpperCase()}</b> · legrövidebb út: {par} lépés
      </p>
      <div className={`szl-board${wave ? ' win-wave' : ''}`} role="list" aria-label="A szólánc">
        {rows.map((w, r) => {
          const isTarget = !solved && r === rows.length - 1;
          const isLast = !solved && r === chain.length - 1;
          const prev = r > 0 && !isTarget ? rows[r - 1] : null;
          return (
            <div key={`${r}-${w}`} role="listitem" className={`szl-row${isTarget ? ' target' : ''}${isLast ? ' current' : ''}${r === 0 ? ' start' : ''}${isLast && shake ? ' shake' : ''}`}>
              {isTarget && <span className="szl-gap" aria-hidden="true">⋮</span>}
              {[...w].map((ch, i) => (
                <button
                  key={i}
                  type="button"
                  tabIndex={isLast ? 0 : -1}
                  disabled={!isLast}
                  aria-label={isLast ? `${i + 1}. betű: ${ch.toUpperCase()}${pos === i ? ' (kiválasztva)' : ''}` : ch.toUpperCase()}
                  className={`szl-tile${prev && prev[i] !== ch ? ' changed' : ''}${isLast && pos === i ? ' sel' : ''}${isTarget && last[i] === ch ? ' match' : ''}`}
                  style={{ '--d': diagFromBottomLeft(r, i, rows.length) }}
                  onClick={() => isLast && setPos(i)}
                >
                  <span className="szl-hit">{ch.toUpperCase()}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className={`szl-msg ${msg?.kind || ''}`} role="status">
        {msg?.text || (solved ? '' : pos < 0 ? 'Koppints a cserélendő betűre a legalsó kész szóban.' : 'Írd be az új betűt.')}
      </div>
      {!solved && (
        <div className="szl-keys" aria-label="Billentyűzet">
          {KEYBOARD.map((row, i) => (
            <div key={i} className="szl-keyrow">
              {row.map((k) => (
                <button key={k} type="button" className="szl-key" onClick={() => put(k)}>
                  {k.toUpperCase()}
                </button>
              ))}
              {i === 3 && (
                <button type="button" className="szl-key wide" onClick={undo} disabled={chain.length < 2} aria-label="Vissza (az utolsó szó törlése)">
                  ↶
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {solved && (
        <>
          <div className="mini-stats stats" style={{ justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span className="pill">Időd: {fmt(elapsed)}</span>
            <span className="pill">
              Lépések: {steps} (legrövidebb: {par})
            </span>
            <span className="pill">Legrövidebb utak: {paths}</span>
          </div>
          {steps > par && best.length > 0 && <p className="szl-best">Egy legrövidebb út: {best.map((w) => w.toUpperCase()).join(' → ')}</p>}
          {!preview && (
            <div className="result-actions game-result-actions">
              <CopyResultButton
                round
                text={[`Napi Szólánc #${number} – ${dayLabel}`, `Nehézség: ${level}/5`, `${start.toUpperCase()} → ${end.toUpperCase()}: ${steps} lépés (legrövidebb: ${par})`, `Idő: ${fmt(elapsed)}`, 'napititkos.hu/szolanc'].join('\n')}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
