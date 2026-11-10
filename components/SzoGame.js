'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { deviceId } from '../lib/device';
import { getIdentity } from '../lib/identity';
import { fireConfetti } from './Confetti';
import { recordSzoFull, recordSzoWord } from '../lib/gameProgress';
import ShareButton from './ShareButton';
import { szoPointsOf, szoPointsTotal } from '../lib/szoPoints';

// Napi szókereső (3x3, a Squaredle mintájára). Szomszédos (átlósan is szomszédos) betűkön húzva
// vagy koppintva lehet szavakat kirakni; húzás közben vonal köti össze a betűket. Egy szóban
// minden négyzet egyszer használható. Koppintásnál: a következő szomszédos betűre koppintva bővül
// a szó, az utolsó betűre újra koppintva beküldi.
// Szólista hossz szerint; két jelölőnégyzet: ABC-sorrend (a meg nem találtak a helyükön, csillaggal)
// és első/utolsó betű. A haladásjelző egyharmadánál és kétharmadánál egy-egy segítség jár: egy
// még meg nem talált szóra koppintva a rács megmutatja az útját.
const KEY = 'titkositas_szo_v1';
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
export default function SzoGame({ data, onComplete, preview = false, showReport = !preview, onPanel }) {
  const { date, grid, required, bonus, paths } = data;
  const reqSet = useMemo(() => new Set(required), [required]);
  const bonusSet = useMemo(() => new Set(bonus), [bonus]);
  const saved = useMemo(() => (preview ? {} : loadAll()[date] || {}), [date, preview]);
  const [found, setFound] = useState(() => (preview ? [] : [...new Set([...(saved.found || []), ...(data.mine?.found || [])])]));
  const [elapsed, setElapsed] = useState(saved.elapsed || data.mine?.elapsed || 0);
  const [hints, setHints] = useState(saved.hints || 0);
  const [stars, setStars] = useState(saved.stars || 0); // hány csillagot (segítséget) kapott már
  const [shown, setShown] = useState(saved.shown || null); // a felfedett szó (útjával)
  const [abc, setAbc] = useState(!!saved.abc);
  const [outer, setOuter] = useState(!!saved.outer);
  const [path, setPath] = useState([]);
  const [panel, setPanel] = useState(false);
  const [lastWord, setLastWord] = useState(null); // a legutóbb beküldött szó (a beírás felülírja)
  const togglePanel = (v) => {
    setPanel(v);
    onPanel && onPanel(v);
  };
  const shareText = () => {
    const d = new Date(`${date}T12:00:00Z`).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' });
    const pts = szoPointsTotal(foundReq);
    const tail = done ? `Megtaláltam mind a ${total} szót ${fmt(elapsed)} alatt, ${pts} pont! 🎉` : `${foundReq.length}/${total} szó, ${pts} pont eddig.`;
    return `🔤 Napi szókereső – ${d}\n${tail}\nPróbáld ki te is: https://napititkos.hu/szokereso`;
  };
  const [msg, setMsg] = useState(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const boardRef = useRef(null);
  const startRef = useRef(Date.now() - (saved.elapsed || data.mine?.elapsed || 0));
  const syncT = useRef(null);

  const foundReq = found.filter((w) => reqSet.has(w));
  const foundBonus = found.filter((w) => bonusSet.has(w));
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
    saveDay(date, { found, elapsed, hints, stars, shown, abc, outer });
  }, [date, found, elapsed, hints, stars, shown, abc, outer]);

  function sync(words, el) {
    if (preview) return;
    clearTimeout(syncT.current);
    syncT.current = setTimeout(() => {
      fetch('/api/szo/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, words, elapsed: el, device: deviceId(), name: getIdentity().name }),
      }).catch(() => {});
    }, 400);
  }

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
    if (shown?.word === w) setShown(null);
    if (bonusSet.has(w)) flash('Bónuszszó!', 'good');
    else {
      const n = next.filter((x) => reqSet.has(x)).length;
      // Csillagok egyharmadnál és kétharmadnál: egy-egy segítség.
      const earned = (n >= Math.ceil(total / 3) ? 1 : 0) + (n >= Math.ceil((2 * total) / 3) ? 1 : 0);
      if (earned > stars && n < total) {
        setHints((h) => h + (earned - stars));
        setStars(earned);
        flash(`+${szoPointsOf(w)} pont · Segítséget kaptál!`, 'good', 3200);
      } else flash(n >= total ? `+${szoPointsOf(w)} pont · Mind megvan!` : `Szép! +${szoPointsOf(w)} pont`, 'good', n >= total ? 3200 : 1900);
      if (n >= total) {
        fireConfetti();
        if (!preview) recordSzoFull(date);
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

  function useHint(w) {
    if (hints < 1 || found.includes(w)) return;
    setHints((h) => h - 1);
    setShown({ word: w, path: paths[w] });
    flash('Megmutattuk az útját!', 'good', 2400);
  }

  // Szólista hossz szerint.
  const groups = useMemo(() => {
    const by = {};
    for (const w of required) (by[len(w)] = by[len(w)] || []).push(w);
    return Object.entries(by).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [required]);
  const mask = (w) => (outer ? `${Array.from(w)[0]}${'*'.repeat(len(w) - 2)}${Array.from(w).slice(-1)}` : '*'.repeat(len(w))).toUpperCase();

  const current = path.map((i) => grid[i]).join('').toUpperCase();
  const pct = total ? Math.round((foundReq.length / total) * 100) : 0;
  return (
    <div className="szo-game">
      <div className="szo-top">
        <span className="timer">{fmt(elapsed)}</span>
        <span className="szo-hints" aria-live="polite">{hints > 0 ? `Segítség: ${hints}` : ''}</span>
      </div>
      <div className="szo-progress" aria-label={`${foundReq.length} / ${total} szó`}>
        <div className="szo-bar">
          <span style={{ width: `${pct}%` }} />
          <i className={`szo-star${stars >= 1 ? ' got' : ''}`} style={{ left: '33.3%' }} aria-hidden="true">★</i>
          <i className={`szo-star${stars >= 2 ? ' got' : ''}`} style={{ left: '66.6%' }} aria-hidden="true">★</i>
        </div>
        <span className="szo-count">
          {foundReq.length} / {total} szó · {szoPointsTotal(foundReq)} pont{foundBonus.length ? ` · ${foundBonus.length} bónusz` : ''}
        </span>
      </div>
      {/* Szavak: a két jelölőnégyzet, a szólista és a hibajelzés egy lenyíló panelben. */}
      <button type="button" className={`szo-words-btn${panel ? ' open' : ''}`} aria-expanded={panel} onClick={() => togglePanel(!panel)}>
        Szavak <span>{foundReq.length}/{total}</span> <span aria-hidden="true">{panel ? '▴' : '▾'}</span>
      </button>
      {panel && (
        <div className="szo-words-panel">
        <div className="szo-options">
          <label className="checkbox-row">
            <input type="checkbox" checked={abc} onChange={(e) => setAbc(e.target.checked)} /> ABC-sorrend (a még meg nem talált szavak a helyükön)
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={outer} onChange={(e) => setOuter(e.target.checked)} /> Első és utolsó betű mutatása
          </label>
        </div>
        {hints > 0 && !done && <p className="mini-muted">Van {hints} segítséged: koppints egy csillagos (még meg nem talált) szóra, és megmutatjuk az útját.</p>}
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
                        <button type="button" className={`szo-masked${hints > 0 ? ' can' : ''}${shown?.word === w ? ' shown' : ''}`} disabled={hints < 1 && shown?.word !== w} onClick={() => useHint(w)} aria-label={hints > 0 ? 'Még meg nem talált szó – koppints a segítséghez' : 'Még meg nem talált szó'}>
                          {mask(w)}
                        </button>
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
        className={`szo-board${done ? ' done' : ''}`}
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
          {shown?.path && <polyline className="hint" points={shown.path.map((i) => CENTER(i).join(',')).join(' ')} />}
          {path.length > 1 && <polyline points={path.map((i) => CENTER(i).join(',')).join(' ')} />}
        </svg>
        {[0, 1, 2].map((r) => (
          <div key={r} role="row" className="szo-row">
            {[0, 1, 2].map((c) => {
              const i = r * 3 + c;
              const hintStep = shown?.path ? shown.path.indexOf(i) : -1;
              return (
                <span key={i} role="gridcell" className={`szo-cell${path.includes(i) ? ' on' : ''}${hintStep >= 0 ? ' hint' : ''}`} aria-label={grid[i].toUpperCase()}>
                  <span className="szo-hit" data-szo-cell={i} onPointerDown={(e) => onDown(e, i)}>
                    {grid[i].toUpperCase()}
                  </span>
                  {hintStep >= 0 && <span className="szo-step">{hintStep + 1}</span>}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {done && (
        <div className="feedback good" role="status" style={{ marginLeft: 0 }}>
          Megtaláltad az összes szót! Időd: {fmt(elapsed)} · A napi szó: <b>{data.word.toUpperCase()}</b>
        </div>
      )}
      {(foundReq.length > 0 || done) && (
        <div className="szo-share">
          <ShareButton text={shareText()} />
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
