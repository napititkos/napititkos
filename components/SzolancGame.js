'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameHead from './GameHead';
import CopyResultButton from './CopyResultButton';
import NextGameButton from './NextGameButton';
import { deviceId } from '../lib/device';
import { fireConfetti } from './Confetti';
import { useWinWave, diagFromBottomLeft } from '../lib/winWave';
import { hasSzolancLength, isWord, oneLetterApart, shortestPath } from '../lib/szolanc';

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
  // A szavak hossza (3, 4 vagy 5 betű) a feladványtól függ.
  const N = [...start].length;
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
  // Újrapróbálás: a megfejtés után a lánc újra kirakható gyakorlásként (nem kerül újra a ranglistára,
  // és nem írja felül a mentett megfejtést).
  const [practice, setPractice] = useState(false);
  const [showBest, setShowBest] = useState(false);
  const [bestPath, setBestPath] = useState(null);
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
    if (preview || practice || (compact && !solved)) return;
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
  // Az 5 betűs szavak listája csak a szerveren van: ott a szerver ellenőrzi a szót.
  const checking = useRef(false);
  const submit = useCallback(async () => {
    if (solved || checking.current) return;
    const next = typed;
    if ([...next].length < N) return flash(`Írj be egy ${N} betűs szót!`, 'info');
    if (next === last) return flash('Változtass meg egy betűt!', 'info');
    if (!oneLetterApart(last, next)) return flash('Csak egy betűt változtathatsz meg!');
    // Egy korábbi szó újra beírható (így lehet visszalépni; minden beírás egy lépésnek számít).
    let ok = hasSzolancLength(N) ? isWord(next) : false;
    if (!hasSzolancLength(N)) {
      checking.current = true;
      try {
        ok = !!(await (await fetch(`/api/szolanc/check?w=${encodeURIComponent(next)}`)).json()).ok;
      } catch {
        ok = false;
      }
      checking.current = false;
    }
    if (!ok) return flash(`„${next.toUpperCase()}” nincs a szótárunkban.`);
    const nc = [...chain, next];
    setChain(nc);
    setTyped('');
    setMsg(null);
    if (next === end) {
      const el = Date.now() - startRef.current;
      setElapsed(el);
      playWave(nc.length + 4);
      fireConfetti();
      if (!practice) onSolved && onSolved({ steps: nc.length - 1, elapsed: el, chain: nc });
    }
  }, [solved, typed, last, chain, end, playWave, onSolved, N]);

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

  const best = useMemo(() => (solved && hasSzolancLength(N) ? shortestPath(start, end) : []), [solved, start, end, N]);
  // Egy legrövidebb út megmutatása (az 5 betűs szavak listája csak a szerveren van: onnan kérjük).
  async function toggleBest() {
    if (showBest) return setShowBest(false);
    if (!bestPath) {
      if (best.length) setBestPath(best);
      else {
        try {
          const d = await (await fetch(`/api/szolanc?date=${date}&device=${deviceId()}`, { cache: 'no-store' })).json();
          if (Array.isArray(d.best)) setBestPath(d.best);
        } catch {}
      }
    }
    setShowBest(true);
  }
  function retry() {
    setPractice(true);
    setShowBest(false);
    setChain([start]);
    setTyped('');
    setMsg(null);
    startRef.current = Date.now();
    setElapsed(0);
  }
  const steps = data.mine && !serverChain && chain.length === 2 ? data.mine.steps : chain.length - 1;
  const rows = [...chain, ...(solved ? [] : [end])];
  const dayLabel = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="szolanc" style={{ '--szl-n': N }}>
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
                  {/* a játék többi nyilával egyező stílus: vastag, lekerekített végű */}
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 5v6.5a2 2 0 0 1-2 2H6.5M10.5 9l-4.5 4.5 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
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
          {practice && <p className="szl-best">Gyakorlás: ez a megoldás már nem kerül a ranglistára.</p>}
          {showBest && bestPath && <p className="szl-best">Egy legrövidebb út: {bestPath.map((w) => w.toUpperCase()).join(' → ')}</p>}
          {!preview && (
            <div className="result-actions game-result-actions szl-actions">
              {!compact && (
                <CopyResultButton
                round
                text={[`Napi Szólánc #${number} – ${dayLabel}`, `Nehézség: ${level}/5`, `${start.toUpperCase()} → ${end.toUpperCase()}: ${steps} lépés (legrövidebb: ${par})`, `Idő: ${fmt(elapsed)}`, 'napititkos.hu/szolanc'].join('\n')}
                />
              )}
              {/* Újrapróbálás (gyakorlásként) és – ha nem a legrövidebb úton jutott célba – egy legrövidebb út. */}
              <div className="result-action">
                <button type="button" className="primary round-btn" onClick={retry} aria-label="Újrapróbálom">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7M19.5 4.5v4.3h-4.3" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span>Újrapróbálom</span>
              </div>
              {steps > par && (
                <div className="result-action">
                  <button type="button" className={`primary round-btn${showBest ? ' on' : ''}`} onClick={toggleBest} aria-label="Legrövidebb út" aria-pressed={showBest}>
                    <span className="szl-hash1" aria-hidden="true">
                      #1
                    </span>
                  </button>
                  <span>Legrövidebb út</span>
                </div>
              )}
              {!compact && <NextGameButton current="szolanc" />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
