'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameHead from './GameHead';
import CopyResultButton from './CopyResultButton';
import { fireConfetti } from './Confetti';
import { useWinWave, diagFromBottomLeft } from '../lib/winWave';
import { isWord, oneLetterApart, shortestPath } from '../lib/szolanc';

// Szólánc (prototípus): a kezdőszóból a célszóba kell eljutni; minden lépésben pontosan egy betű
// változik (a helye marad), és minden közbülső alak létező szó (ragozott alak is lehet).
// Kezelés: a kezdőszó és a célszó között egy üres sorba kell beírni a következő szót (saját
// billentyűzet, gépen a billentyűzet is; ⌫ betűt töröl, ↵ beküld). Visszalépni a korábbi szó újbóli
// beírásával lehet (az is egy lépés). Ha egynél több betű változott,
// vagy nincs ilyen szó, üzenet jön; ha jó, a szó a láncba kerül, és lenyílik egy új üres sor.
//   data: { date, number, level, start, end, par, paths }
//   preview: Kisokos (nincs mentés)
const KEY = 'titkositas_szolanc_v1';
const KEYBOARD = [
  ['ö', 'ü', 'ó', 'ő', 'ú', 'ű', 'é', 'á', 'í'],
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['y', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const N = 4;
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

// compact: korábbi Szólánc az archívumban (nincs fejléc, a haladás nem mentődik, csak a teljesítés).
export default function SzolancGame({ data, preview = false, compact = false, onSolved }) {
  const { date, start, end, par, paths, level, number } = data;
  const saved = useMemo(() => (preview || compact ? {} : loadAll()[date] || {}), [date, preview, compact]);
  // Ha a szerver szerint a szereplő már megfejtette (más eszközön, vagy bejelentkezés előtt), a
  // megfejtett lánc jelenik meg, és nem tölthető ki újra.
  const serverChain = data.mine?.chain && data.mine.chain[0] === start && data.mine.chain[data.mine.chain.length - 1] === end ? data.mine.chain : null;
  const [chain, setChain] = useState(() => serverChain || (Array.isArray(saved.chain) && saved.chain[0] === start ? saved.chain : data.mine ? [start, end] : [start]));
  // Az üres sorba írt betűk (legfeljebb 4).
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState(null);
  const [shake, setShake] = useState(false);
  const solved = chain[chain.length - 1] === end;
  const [elapsed, setElapsed] = useState(data.mine?.elapsed || saved.elapsed || 0);
  const startRef = useRef(Date.now() - (data.mine?.elapsed || saved.elapsed || 0));
  const [wave, playWave] = useWinWave();
  const last = chain[chain.length - 1];
  // Mobilon a napi (és a korábbi) Szóláncnál a billentyűzet a képernyő aljára rögzített, amíg nincs kész;
  // a helyét egy ugyanakkora térköz tartja, hogy semmi ne kerüljön alá.
  // Csak mobilon (keskeny kijelzőn); asztali gépen a billentyűzet a helyén marad.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  const fixedKeys = !preview && !solved && narrow;
  const keysRef = useRef(null);
  const boardRef = useRef(null);
  const [keysH, setKeysH] = useState(0);
  useEffect(() => {
    if (!fixedKeys || !keysRef.current) return;
    const el = keysRef.current;
    const upd = () => setKeysH(el.offsetHeight);
    upd();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(upd) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [fixedKeys]);
  // Szó beírása után az oldal (mobilon és asztali gépen is) úgy gördül, hogy látsszon a most beírt
  // szó, az üres sor és a célszó (mobilon a rögzített billentyűzet fölött); ha nem fér ki minden,
  // a most beírt szó a fontosabb.
  useEffect(() => {
    if (preview || solved || chain.length < 2) return;
    const t = setTimeout(() => {
      const board = boardRef.current;
      if (!board) return;
      const rows = board.querySelectorAll('.szl-row');
      const fresh = rows[chain.length - 1];
      const labels = board.querySelectorAll('.szl-label');
      const bottomEl = labels[labels.length - 1];
      if (!fresh || !bottomEl) return;
      const limit = window.innerHeight - (fixedKeys ? keysRef.current?.offsetHeight || 0 : 0) - 10;
      let dy = bottomEl.getBoundingClientRect().bottom - limit;
      const top = fresh.getBoundingClientRect().top - 10;
      if (dy > top) dy = top;
      if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: 'smooth' });
    }, 60);
    return () => clearTimeout(t);
  }, [chain.length, fixedKeys, preview, solved]);

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(t);
  }, [solved]);
  useEffect(() => {
    if (preview || (compact && !solved)) return;
    try {
      const all = loadAll();
      all[date] = compact ? { ...(all[date] || {}), archiveSolved: true } : { chain, elapsed, solved };
      const keys = Object.keys(all).sort();
      while (keys.length > 60) delete all[keys.shift()];
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  }, [chain, elapsed, solved, date, preview, compact]);

  const flash = (text, kind = 'bad') => {
    setMsg({ text, kind });
    if (kind === 'bad') {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const type = useCallback(
    (letter) => {
      if (solved) return;
      setMsg(null);
      setTyped((t) => ([...t].length >= N ? t : t + letter));
    },
    [solved]
  );
  const erase = useCallback(() => {
    if (solved) return;
    setMsg(null);
    setTyped((t) => [...t].slice(0, -1).join(''));
  }, [solved]);
  const submit = useCallback(() => {
    if (solved) return;
    const next = typed;
    if ([...next].length < N) return flash('Írj be egy 4 betűs szót!', 'info');
    if (next === last) return flash('Változtass meg egy betűt!', 'info');
    if (!oneLetterApart(last, next)) return flash('Csak egy betűt változtathatsz meg!');
    // Egy korábbi szó újra beírható (így lehet visszalépni; minden beírás egy lépésnek számít).
    if (!isWord(next)) return flash(`„${next.toUpperCase()}” nincs a szótárunkban.`);
    const nc = [...chain, next];
    setChain(nc);
    setTyped('');
    setMsg(null);
    if (next === end) {
      const el = Date.now() - startRef.current;
      setElapsed(el);
      playWave(nc.length + 4);
      fireConfetti();
      onSolved && onSolved({ steps: nc.length - 1, elapsed: el, chain: nc });
    }
  }, [solved, typed, last, chain, end, playWave, onSolved]);

  // Gépi billentyűzet: betűk, Backspace (betű törlése), Enter (beküldés).
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('.modal-overlay') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'backspace') {
        e.preventDefault();
        return erase();
      }
      if (k === 'enter') {
        e.preventDefault();
        return submit();
      }
      if (LETTERS.has(k)) {
        e.preventDefault();
        type(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [type, erase, submit]);

  const best = useMemo(() => (solved ? shortestPath(start, end) : []), [solved, start, end]);
  const steps = data.mine && !serverChain && chain.length === 2 ? data.mine.steps : chain.length - 1;
  const rows = [...chain, ...(solved ? [] : [end])];
  const dayLabel = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="szolanc">
      {!preview && !compact && <GameHead title="Napi Szólánc" number={number} level={level} dateLabel={dayLabel} time={fmt(elapsed)} />}
      {/* Fent a kezdőszó, alatta a lánc, utána (amíg nincs kész) az üres sor, legalul a célszó. */}
      <div ref={boardRef} className={`szl-board${wave ? ' win-wave' : ''}`} role="list" aria-label="A szólánc">
        <span className="szl-label">KEZDŐ SZÓ</span>
        {chain.map((w, r) => {
          const prev = r > 0 ? chain[r - 1] : null;
          const isEnd = solved && r === chain.length - 1;
          return (
            <div key={`${r}-${w}`} role="listitem" className={`szl-row${r === 0 ? ' start' : ''}${isEnd ? ' goal' : ''}${r > 0 && r === chain.length - 1 ? ' fresh' : ''}`}>
              {[...w].map((ch, i) => (
                <span key={i} className={`szl-tile${prev && prev[i] !== ch ? ' changed' : ''}`} style={{ '--d': diagFromBottomLeft(r, i, chain.length) }}>
                  <span className="szl-hit">{ch.toUpperCase()}</span>
                </span>
              ))}
            </div>
          );
        })}
        {!solved && (
          <div key={`in-${chain.length}`} role="listitem" aria-label="A következő szó" className={`szl-row input${shake ? ' shake' : ''}`}>
            {Array.from({ length: N }, (_, i) => {
              const ch = [...typed][i];
              return (
                <span key={i} className={`szl-tile${ch ? ' filled' : ''}${i === [...typed].length ? ' cursor' : ''}`}>
                  <span className="szl-hit">{ch ? ch.toUpperCase() : ''}</span>
                </span>
              );
            })}
          </div>
        )}
        {!solved && (
          <div role="listitem" className="szl-row target">
            {[...end].map((ch, i) => (
              <span key={i} className={`szl-tile${last[i] === ch ? ' match' : ''}`}>
                <span className="szl-hit">{ch.toUpperCase()}</span>
              </span>
            ))}
          </div>
        )}
        <span className="szl-label">CÉL SZÓ</span>
      </div>
      {fixedKeys && <div className="szl-keys-spacer" style={{ height: keysH }} aria-hidden="true" />}
      {!solved && (
        <div ref={keysRef} className={`szl-keys${fixedKeys ? ' fixed' : ''}`} aria-label="Billentyűzet">
          {/* Az üzenetsor a billentyűzet tetején: így mindig látszik (megfejtés után eltűnik, és a
              statisztika közvetlenül a célszó alatt jön). */}
          <div className={`szl-msg ${msg?.kind || ''}`} role="status">
            {msg?.text || 'Írd be a következő szót: egy betű változhat.'}
          </div>
          {KEYBOARD.map((row, i) => (
            <div key={i} className="szl-keyrow">
              {row.map((k) => (
                <button key={k} type="button" className="szl-key" onClick={() => type(k)}>
                  {k.toUpperCase()}
                </button>
              ))}
              {/* A sor végén egymás alatt: Törlés (⌫) és Beküldés (↵). */}
              {i === 2 && (
                <button type="button" className="szl-key wide erase" onClick={erase} aria-label="Betű törlése">
                  ⌫
                </button>
              )}
              {i === 3 && (
                <button type="button" className="szl-key wide enter" onClick={submit} aria-label="Beküldés">
                  ↵
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
          </div>
          {steps > par && best.length > 0 && <p className="szl-best">Egy legrövidebb út: {best.map((w) => w.toUpperCase()).join(' → ')}</p>}
          {!preview && !compact && (
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
