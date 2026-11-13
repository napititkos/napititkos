'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { deviceId } from '../lib/device';
import { getIdentity } from '../lib/identity';
import { fireConfetti } from './Confetti';
import { recordSzoFull, recordSzoWord } from '../lib/gameProgress';
import CopyResultButton from './CopyResultButton';
import GameHead from './GameHead';
import { diagFromBottomLeft, useWinWave } from '../lib/winWave';
import { dayLevel } from '../lib/dayLevel';
import { szoPointsOf, szoPointsTotal } from '../lib/szoPoints';
import { minimalCells } from '../lib/szoCells';

// Napi szókereső (3x3, a Squaredle mintájára). Szomszédos (átlósan is szomszédos) betűkön húzva
// vagy koppintva lehet szavakat kirakni; húzás közben vonal köti össze a betűket. Egy szóban
// minden négyzet egyszer használható. Koppintásnál: a következő szomszédos betűre koppintva bővül
// a szó, az utolsó betűre újra koppintva beküldi.
// Szólista hossz szerint; két jelölőnégyzet: ABC-sorrend (a meg nem találtak a helyükön, csillaggal)
// és első/utolsó betű. A haladásjelző egyharmadánál és kétharmadánál egy-egy segítség jár: egy
// még meg nem talált szóra koppintva a rács megmutatja az útját.
const KEY = 'titkositas_szo_v1';
// Egy szó összes útja a rácson (szomszédos négyzeteken, mindegyiket egyszer használva).
function allRoutes(grid, word) {
  const letters = Array.from(word);
  const out = [];
  const rec = (path) => {
    if (path.length === letters.length) return out.push(path.slice());
    const last = path[path.length - 1];
    for (let j = 0; j < 9; j++) {
      if (path.includes(j) || grid[j] !== letters[path.length] || (last != null && !adjacent(last, j))) continue;
      path.push(j);
      rec(path);
      path.pop();
    }
  };
  rec([]);
  return out;
}
const CENTER = (i) => [50 + (i % 3) * 100, 50 + Math.floor(i / 3) * 100];
const adjacent = (a, b) => a !== b && Math.abs(Math.floor(a / 3) - Math.floor(b / 3)) <= 1 && Math.abs((a % 3) - (b % 3)) <= 1;
const len = (w) => Array.from(w).length;
function fmt(ms) {
  const s = Math.floor((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
function saveDay(date, st) {
  try {
    const all = loadAll();
    all[date] = st;
    // csak az utolsó 60 napot tartjuk meg ezen az eszközön
    const keep = Object.keys(all).sort().slice(-60);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep.map((k) => [k, all[k]]))));
  } catch {}
}

// preview: admin kipróbálás – semmi nem mentődik (se az eszközön, se a szerveren, se a trófeákhoz).
// compact: a korábbi szókeresőknél nincs sorszám, dátum és időzítő a rács fölött.
export default function SzoGame({ data, onComplete, preview = false, showReport = !preview, onPanel, closeKey, onStars, compact = false }) {
  const { date, grid, required, bonus, paths } = data;
  const reqSet = useMemo(() => new Set(required), [required]);
  const bonusSet = useMemo(() => new Set(bonus), [bonus]);
  const saved = useMemo(() => (preview ? {} : loadAll()[date] || {}), [date, preview]);
  const [found, setFound] = useState(() => (preview ? [] : [...new Set([...(saved.found || []), ...(data.mine?.found || [])])]));
  const [elapsed, setElapsed] = useState(saved.elapsed || data.mine?.elapsed || 0);
  // A két jelölőnégyzet beállítása megmarad a napok (játékok) között is.
  const prefs = (() => {
    try {
      return JSON.parse(localStorage.getItem('szo_prefs') || '{}');
    } catch {
      return {};
    }
  })();
  const [abc, setAbc] = useState(() => (typeof window === 'undefined' ? false : !!(prefs.abc ?? saved.abc)));
  const [outer, setOuter] = useState(() => (typeof window === 'undefined' ? false : !!(prefs.outer ?? saved.outer)));
  useEffect(() => {
    if (preview) return;
    try {
      localStorage.setItem('szo_prefs', JSON.stringify({ abc, outer }));
    } catch {}
  }, [abc, outer, preview]);
  const [path, setPath] = useState([]);
  const [panel, setPanel] = useState(false);
  const [lastWord, setLastWord] = useState(null); // a legutóbb beküldött szó (a beírás felülírja)
  const togglePanel = (v) => {
    setPanel(v);
    onPanel && onPanel(v);
  };
  // Kívülről (pl. a Kisokos végén) bezárható a Szavak ablak.
  useEffect(() => {
    if (closeKey) setPanel(false);
  }, [closeKey]);
  useEffect(() => {
    if (!panel) return;
    const esc = (e) => e.key === 'Escape' && togglePanel(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel]);
  // A szókereső sorszáma: 2026. november 10. az 1., utána naponta eggyel több.
  const dayNo = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse('2026-11-10T12:00:00Z')) / 86400000) + 1 : 0;
  const dayLabel = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Gyakorlás';
  // Az eredmény szövege (vágólapra): nap, időpont, idő, pontok / max pont, nehézség.
  const shareText = () => {
    const pts = szoPointsTotal(foundReq);
    const max = szoPointsTotal(required);
    const at = new Date(completedAt || Date.now()).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' });
    return [
      `Napi Szókereső #${dayNo} – ${dayLabel}`,
      `Nehézség: ${dayLevel(date)}/5`,
      done ? `Teljesítve ${at}-kor, ${fmt(elapsed)} alatt` : `Állás ${at}-kor, ${fmt(elapsed)} után`,
      `Pontok: ${pts}/${max} · Szavak: ${foundReq.length}/${total}`,
      'napititkos.hu/szokereso',
    ].join('\n');
  };
  const [msg, setMsg] = useState(null);
  const [wave, playWave] = useWinWave();
  const [completedAt, setCompletedAt] = useState(saved.completedAt || null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const boardRef = useRef(null);
  const startRef = useRef(Date.now() - (saved.elapsed || data.mine?.elapsed || 0));
  const syncT = useRef(null);

  const foundReq = found.filter((w) => reqSet.has(w));
  const foundBonus = found.filter((w) => bonusSet.has(w));
  // A csillagok a megtalált szavak pontjaiból számolódnak (így újratöltés, másik eszköz vagy
  // teljesítés után is színesek maradnak).
  const stars = (() => {
    const pts = szoPointsTotal(foundReq);
    const all = szoPointsTotal(required);
    return all ? (pts * 3 >= all ? 1 : 0) + (pts * 3 >= 2 * all ? 1 : 0) : 0;
  })();
  // A még meg nem talált kötelező szavak útjai: ebből számoljuk, mely betűkhöz tartozik még szó (a
  // többi kifakul), és a csillagok jutalmát: hány szó kezdődik az adott négyzettel, és hány szó
  // tartalmazza (szavanként egyszer számolva). Ha egy betű többször is szerepel a rácsban (pl. két O),
  // egy szónak több útja is lehet; ilyenkor a lehető legkevesebb négyzetet tartjuk meg, amelyeken
  // MINDEN hátralévő szó kirakható (a többi kifakul). Ha több ilyen legkisebb választás van, az előzőleg
  // megtartott négyzetek közül választunk (így semmi nem villan vissza), különben a nap szerint
  // véletlenszerűen. A kifakult négyzet továbbra is használható, csak halványabb.
  const keptRef = useRef(null);
  const live = useMemo(() => {
    const starts = Array(9).fill(0);
    const has = Array(9).fill(0);
    const left = required.filter((w) => !found.includes(w));
    const routes = left.map((w) => allRoutes(grid, w));
    const kept = minimalCells(routes, keptRef.current, `${date}|${left.length}`);
    keptRef.current = kept;
    routes.forEach((rs) => {
      const inside = rs.filter((r) => r.every((i) => kept.has(i)));
      new Set(inside.map((r) => r[0])).forEach((i) => starts[i]++);
      new Set(inside.flat()).forEach((i) => has[i]++);
    });
    return { starts, has, cells: kept };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, required, found]);
  const total = required.length;
  const done = foundReq.length >= total && total > 0;

  // Időzítő: amíg nincs kész, és a lap látható.
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') setElapsed(Date.now() - startRef.current);
    }, 1000);
    const vis = () => {
      if (document.visibilityState === 'visible') startRef.current = Date.now() - elapsedRef.current;
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [done]);
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  useEffect(() => {
    if (preview) return;
    saveDay(date, { found, elapsed, stars, abc, outer, completedAt });
  }, [date, found, elapsed, stars, abc, outer, completedAt]);

  // A haladás mentése a szerverre (kis késleltetéssel összevonva). Ha a játékos közben elhagyja az
  // oldalt, a függő mentés azonnal elmegy (sendBeacon), így az utolsó szavak sem vesznek el.
  const pendingSync = useRef(null);
  function sync(words, el) {
    if (preview) return;
    clearTimeout(syncT.current);
    pendingSync.current = JSON.stringify({ date, words, elapsed: el, device: deviceId(), name: getIdentity().name });
    syncT.current = setTimeout(flushSync, 400);
  }
  function flushSync(beacon = false) {
    const body = pendingSync.current;
    if (!body) return;
    pendingSync.current = null;
    clearTimeout(syncT.current);
    if (beacon && navigator.sendBeacon && navigator.sendBeacon('/api/szo/progress', new Blob([body], { type: 'application/json' }))) return;
    fetch('/api/szo/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
  useEffect(() => {
    const out = () => flushSync(true);
    const vis = () => document.visibilityState === 'hidden' && flushSync(true);
    window.addEventListener('pagehide', out);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('pagehide', out);
      document.removeEventListener('visibilitychange', vis);
      flushSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visszajelzés: külön sorban a szó fölött, halványodva tűnik el (a hossza nem tolja el a rácsot).
  function flash(text, kind = 'info', ms = 1900) {
    const id = Date.now() + Math.random();
    setMsg({ text, kind, id, ms });
    clearTimeout(flash.t);
    flash.t = setTimeout(() => setMsg((m) => (m && m.id === id ? null : m)), ms);
  }

  function submit(p) {
    const w = p.map((i) => grid[i]).join('');
    if (p.length < 3) return;
    if (found.includes(w)) {
      setLastWord({ text: w.toUpperCase(), kind: 'muted' });
      return flash('Már megvan', 'muted');
    }
    if (!reqSet.has(w) && !bonusSet.has(w)) {
      setLastWord({ text: w.toUpperCase(), kind: 'bad' });
      return flash('Nincs a listán', 'bad');
    }
    setLastWord({ text: w.toUpperCase(), kind: bonusSet.has(w) ? 'bonus' : 'good' });
    const next = [...found, w];
    setFound(next);
    if (!preview) recordSzoWord();
    const el = Date.now() - startRef.current;
    setElapsed(el);
    if (bonusSet.has(w)) flash('Bónuszszó!', 'good');
    else {
      const n = next.filter((x) => reqSet.has(x)).length;
      // Csillagok a pontok egyharmadánál és kétharmadánál. Jutalmuk: az 1. csillagtól a betűk bal
      // felső sarkában, hány még meg nem talált szó kezdődik velük; a 2. csillagtól a jobb felső
      // sarokban, hány még meg nem talált szó tartalmazza őket.
      const pts = szoPointsTotal(next.filter((x) => reqSet.has(x)));
      const all = szoPointsTotal(required);
      const earned = (pts * 3 >= all ? 1 : 0) + (pts * 3 >= 2 * all ? 1 : 0);
      if (earned > stars) {
        onStars && onStars(earned);
      }
      if (earned > stars && n < total) flash(`+${szoPointsOf(w)} pont · Jutalom: számok a betűkön!`, 'good', 3200);
      else flash(n >= total ? `+${szoPointsOf(w)} pont · Mind megvan!` : `Szép! +${szoPointsOf(w)} pont`, 'good', n >= total ? 3200 : 1900);
      if (n >= total) {
        fireConfetti();
        if (!preview) recordSzoFull(date);
        setCompletedAt(Date.now());
        playWave(5);
        if (!preview && onComplete) onComplete(el);
      }
    }
    sync(next, el);
  }

  // Húzás / koppintás a rácson.
  // Melyik négyzet fölött van az ujj/egér: a rács geometriájából, a négyzet közepétől mért
  // távolság alapján (a négyzetek közel vannak egymáshoz, így átlós húzásnál a sarkoknál nem
  // akad bele a szomszédba).
  function cellFromPoint(x, y) {
    const r = boardRef.current?.getBoundingClientRect();
    if (!r) return null;
    const size = r.width / 3;
    const col = Math.floor((x - r.left) / size);
    const row = Math.floor((y - r.top) / size);
    if (col < 0 || col > 2 || row < 0 || row > 2) return null;
    const cx = r.left + (col + 0.5) * size;
    const cy = r.top + (row + 0.5) * size;
    return Math.hypot(x - cx, y - cy) <= size * 0.4 ? row * 3 + col : null;
  }
  // Az útvonalat refben is követjük, hogy a mellékhatások (beküldés) ne a setState-ben fussanak.
  const pathRef = useRef([]);
  const setP = (p) => {
    pathRef.current = p;
    setPath(p);
  };
  function onDown(e, i) {
    if (done) return;
    e.preventDefault();
    boardRef.current?.setPointerCapture?.(e.pointerId);
    dragging.current = true;
    moved.current = false;
    const p = pathRef.current;
    if (p.length && p[p.length - 1] === i) return; // koppintás az utolsóra: felengedéskor beküldés
    if (p.length && adjacent(p[p.length - 1], i) && !p.includes(i)) setP([...p, i]);
    else setP([i]);
    tapLast.current = tapLast.current === i ? i : null;
  }
  function onMove(e) {
    if (!dragging.current) return;
    const i = cellFromPoint(e.clientX, e.clientY);
    const p = pathRef.current;
    if (i == null || !p.length) return;
    const last = p[p.length - 1];
    if (i === last) return;
    if (p.length >= 2 && i === p[p.length - 2]) {
      moved.current = true;
      setP(p.slice(0, -1)); // visszahúzás
    } else if (!p.includes(i) && adjacent(last, i)) {
      moved.current = true;
      setP([...p, i]);
    }
  }
  function onUp(e) {
    if (!dragging.current) return;
    dragging.current = false;
    const i = cellFromPoint(e.clientX, e.clientY);
    const p = pathRef.current;
    if (moved.current) {
      submit(p);
      setP([]);
      tapLast.current = null;
      return;
    }
    // Koppintás: ha a már kijelölt utolsó betűre koppintott újra, beküldjük.
    if (p.length >= 3 && i === p[p.length - 1] && tapLast.current === i) {
      submit(p);
      setP([]);
      tapLast.current = null;
      return;
    }
    tapLast.current = i;
  }
  const tapLast = useRef(null);

  // Ha a rácson kívülre (vagy a négyzetek közé) koppint, a félbehagyott kijelölés törlődik.
  useEffect(() => {
    const onDocDown = (e) => {
      if (!pathRef.current.length) return;
      const hit = e.target?.closest?.('[data-szo-cell]');
      if (hit && boardRef.current?.contains(hit)) return;
      dragging.current = false;
      tapLast.current = null;
      setP([]);
    };
    document.addEventListener('pointerdown', onDocDown, true);
    return () => document.removeEventListener('pointerdown', onDocDown, true);
  }, []);



  // Szólista hossz szerint.
  const groups = useMemo(() => {
    const by = {};
    for (const w of required) (by[len(w)] = by[len(w)] || []).push(w);
    return Object.entries(by).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [required]);
  const mask = (w) => (outer ? `${Array.from(w)[0]}${'*'.repeat(len(w) - 2)}${Array.from(w).slice(-1)}` : '*'.repeat(len(w))).toUpperCase();

  const current = path.map((i) => grid[i]).join('').toUpperCase();
  // A haladásjelző (és a csillagok) a pontok szerint halad: hosszabb szóra nagyobbat ugrik.
  const totalPts = szoPointsTotal(required);
  const pct = totalPts ? Math.round((szoPointsTotal(foundReq) / totalPts) * 100) : 0;
  return (
    <div className="szo-game">
      {!compact && (
      <GameHead title="Napi Szókereső" number={dayNo} level={dayNo > 0 ? dayLevel(date) : 1} dateLabel={dayLabel} time={fmt(elapsed)} />
      )}
      <div className="szo-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Haladás: ${foundReq.length} / ${total} szó, ${szoPointsTotal(foundReq)} pont`}>
        <div className="szo-bar">
          <span style={{ width: `${pct}%` }} />
          <i className={`szo-star${stars >= 1 ? ' got' : ''}`} style={{ left: '33.3%' }} aria-hidden="true">★</i>
          <i className={`szo-star${stars >= 2 ? ' got' : ''}`} style={{ left: '66.6%' }} aria-hidden="true">★</i>
          {/* A végén a kupa: az összes szó (a teljes pontszám) elérésekor színes. */}
          <span className={`szo-cup${done ? ' got' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M7 3h10v5a5 5 0 0 1-10 0V3z" fill="#F2B632" stroke="#B9831A" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M7 5H4.2v1.4A3.4 3.4 0 0 0 7.6 9.8M17 5h2.8v1.4a3.4 3.4 0 0 1-3.4 3.4" fill="none" stroke="#B9831A" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M12 13v3.6M8.6 20.6h6.8l-.9-3.9H9.5z" fill="#F2B632" stroke="#B9831A" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
      {/* Szavak: a két jelölőnégyzet, a szólista és a hibajelzés egy lenyíló panelben. */}
      <button type="button" className={`szo-words-btn${panel ? ' open' : ''}`} aria-haspopup="dialog" onClick={() => togglePanel(true)}>
        {foundReq.length}/{total} szó · {szoPointsTotal(foundReq)} pont
      </button>
      {panel && (
        <div className="modal-overlay szo-words-overlay" onClick={() => togglePanel(false)}>
        <div className="modal-card szo-words-panel" role="dialog" aria-label="Szavak" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="modal-x szo-words-x" aria-label="Bezárás" onClick={() => togglePanel(false)}>
            ×
          </button>
          <h2 className="szo-words-title">
            Szavak <span>{foundReq.length}/{total}</span>
          </h2>
        <div className="szo-options">
          <label className="checkbox-row">
            <input type="checkbox" checked={abc} onChange={(e) => setAbc(e.target.checked)} /> ABC-sorrend (a még meg nem talált szavak a helyükön)
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={outer} onChange={(e) => setOuter(e.target.checked)} /> Első és utolsó betű mutatása
          </label>
        </div>
        <div className="szo-lists">
          {groups.map(([L, words]) => {
            const got = words.filter((w) => found.includes(w));
            const rest = words.filter((w) => !found.includes(w));
            const items = abc ? words.slice().sort((a, b) => a.localeCompare(b, 'hu')) : [...got.sort((a, b) => a.localeCompare(b, 'hu')), ...rest];
            return (
              <div key={L} className="szo-group">
                <h3>
                  {L} betűs <span>({got.length}/{words.length})</span>
                </h3>
                <ul>
                  {items.map((w) =>
                    found.includes(w) ? (
                      <li key={w} className="got">{w.toUpperCase()}</li>
                    ) : (
                      <li key={w}>
                        <span className="szo-masked" aria-label="Még meg nem talált szó">
                          {mask(w)}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            );
          })}
          {foundBonus.length > 0 && (
            <div className="szo-group">
              <h3>Bónuszszavak <span>({foundBonus.length})</span></h3>
              <ul>
                {foundBonus.sort((a, b) => a.localeCompare(b, 'hu')).map((w) => (
                  <li key={w} className="got bonus">{w.toUpperCase()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

          {showReport && <SzoReport date={date} />}
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="primary" onClick={() => togglePanel(false)}>
              Bezárás
            </button>
          </div>
        </div>
        </div>
      )}
      {/* Két külön sor: fölül az üzenet (halványodva eltűnik), alatta a szó. A beírás mindig
          felülírja: amíg betűket húz, az üzenet nem látszik, a szó sorában a beírt betűk állnak. */}
      <div className="szo-say">
        <div className="szo-msg-line" aria-live="polite">
          {msg && !current && (
            <span key={msg.id} className={`szo-msg ${msg.kind}`} style={{ animationDuration: `${msg.ms}ms` }}>
              {msg.text}
            </span>
          )}
        </div>
        <div className={`szo-word-line${current ? ' typing' : lastWord ? ` ${lastWord.kind}` : ''}`}>{current || lastWord?.text || '\u00a0'}</div>
      </div>
      <div
        ref={boardRef}
        className={`szo-board${done ? ' done' : ''}${wave ? ' win-wave' : ''}`}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          dragging.current = false;
          setP([]);
        }}
        role="grid"
        aria-label="Szókereső rács"
      >
        <svg className="szo-lines" viewBox="0 0 300 300" aria-hidden="true">
          {path.length > 1 && <polyline points={path.map((i) => CENTER(i).join(',')).join(' ')} />}
        </svg>
        {[0, 1, 2].map((r) => (
          <div key={r} role="row" className="szo-row">
            {[0, 1, 2].map((c) => {
              const i = r * 3 + c;
              const faded = !done && !live.cells.has(i);
              return (
                <span key={i} role="gridcell" className={`szo-cell${path.includes(i) ? ' on' : ''}${faded ? ' faded' : ''}`} aria-label={`${grid[i].toUpperCase()}${faded ? ' (már nincs hozzá szó)' : ''}`}>
                  <span className="szo-hit" data-szo-cell={i} style={{ '--d': diagFromBottomLeft(Math.floor(i / 3), i % 3, 3) }} onPointerDown={(e) => onDown(e, i)}>
                    {grid[i].toUpperCase()}
                    {stars >= 1 && !done && (
                      <span className="szo-n szo-n-start" title="Ennyi még meg nem talált szó kezdődik ezzel a betűvel">
                        {live.starts[i]}
                      </span>
                    )}
                    {stars >= 2 && !done && (
                      <span className="szo-n szo-n-has" title="Ennyi még meg nem talált szó tartalmazza ezt a betűt">
                        {live.has[i]}
                      </span>
                    )}
                  </span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {!preview && (foundReq.length > 0 || done) && (
        <div className="szo-share">
          <CopyResultButton text={shareText()} />
        </div>
      )}
    </div>
  );
}

// „Problémád van?” – hibajelzés az adminnak (legördülő típus + szöveg).
function SzoReport({ date }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  async function send() {
    const r = await fetch('/api/szo/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, type, text }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg({ ok: true, text: 'Köszönjük, továbbítottuk a jelzésedet!' });
      setText('');
      setType('');
      setOpen(false);
    } else setMsg({ ok: false, text: d.message || 'Nem sikerült elküldeni.' });
  }
  return (
    <div className="szo-report">
      {!open ? (
        <button type="button" className="link-btn" onClick={() => setOpen(true)}>
          Problémád van?
        </button>
      ) : (
        <div className="szo-report-form">
          <label className="field-label" htmlFor="szo-report-type">Mi a probléma?</label>
          <select id="szo-report-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Válassz…</option>
            <option value="missing">Egy szót nem fogad el</option>
            <option value="wrong">Hibás vagy sértő szó a listában</option>
            <option value="other">Egyéb</option>
          </select>
          <label className="field-label" htmlFor="szo-report-text">Részletek (pl. a szó)</label>
          <textarea id="szo-report-text" rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="primary small" disabled={!type || !text.trim()} onClick={send}>
              Küldés
            </button>
            <button type="button" className="ghost small" onClick={() => setOpen(false)}>
              Mégse
            </button>
          </div>
        </div>
      )}
      {msg && <p className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0 }} role="status">{msg.text}</p>}
    </div>
  );
}
