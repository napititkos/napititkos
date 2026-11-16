'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { conflicts } from '../lib/sudokuGen';
import { deviceId } from '../lib/device';
import { fireConfetti } from './Confetti';
import CopyResultButton from './CopyResultButton';
import NextGameButton from './NextGameButton';
import GameHead from './GameHead';
import { diagFromBottomLeft, useWinWave } from '../lib/winWave';
import { getIdentity } from '../lib/identity';

// Napi sudoku (6x6 vagy 9x9, a rács hosszából). Saját számbillentyűzettel (1–6 / 1–9, Törlés, Vissza,
// Jegyzet), hogy mobilon ne jöjjön fel a telefon billentyűzete; gépen a billentyűzet is működik (számok, Backspace/Delete,
// nyilak, N = jegyzet, Ctrl+Z = vissza), és az egér alatti cella kijelölődik. A kijelölt cella
// sora, oszlopa és doboza halványan, maga a cella erősebben ki van emelve. Az ütköző számok
// pirosak. A rács kitöltésekor a szerver ellenőrzi a megoldást.
//   preview: admin kipróbálás és Kisokos – semmi nem mentődik
//   compact: korábbi sudokuknál nincs sorszám, dátum és időzítő a rács fölött
//   onSize: ha meg van adva, a nehézség sorában 6×6 / 9×9 váltó gombok jelennek meg (és megoldás után
//           az „Eredmény másolása” mellett a másik méretre váltó gomb)
// A 9x9-es mentés külön kulcson van, hogy a két méret haladása ne keveredjen.
const KEY = 'titkositas_sudoku_v1';
const KEY9 = 'titkositas_sudoku9_v1';
const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const loadAll = (n = 6) => {
  try {
    return JSON.parse(localStorage.getItem(n === 9 ? KEY9 : KEY) || '{}');
  } catch {
    return {};
  }
};
const saveDay = (date, v, n = 6) => {
  try {
    const all = loadAll(n);
    all[date] = v;
    const keys = Object.keys(all).sort();
    while (keys.length > 60) delete all[keys.shift()];
    localStorage.setItem(n === 9 ? KEY9 : KEY, JSON.stringify(all));
  } catch {}
};
// A rács szerkezete: 6x6-nál 2x3-as, 9x9-nél 3x3-as dobozok.
function geom(n) {
  const br = n === 9 ? 3 : 2;
  const rowOf = (i) => Math.floor(i / n);
  const colOf = (i) => i % n;
  const boxOf = (i) => Math.floor(rowOf(i) / br) * (n / 3) + Math.floor(colOf(i) / 3);
  return { n, br, rowOf, colOf, boxOf, digits: Array.from({ length: n }, (_, k) => k + 1) };
}

export default function SudokuGame({ data, onSolved, preview = false, compact = false, solvedTime = null, onSize = null }) {
  const { date, givens, level, number } = data;
  const N = givens.length === 81 ? 9 : 6;
  const NN = N * N;
  const { rowOf, colOf, boxOf, br, digits } = useMemo(() => geom(N), [N]);
  const saved = useMemo(() => (preview ? {} : loadAll(N)[date] || {}), [date, preview, N]);
  const alreadySolved = solvedTime != null || !!saved.solved;
  // Megoldott napnál, ha az eszközön nincs meg a kitöltés (pl. másik eszközön oldotta meg), a
  // szervertől kapott megoldás látszik – így soha nem jelenik meg üresen a megoldott rács.
  const [grid, setGrid] = useState(() => {
    const local = saved.grid?.length === NN ? saved.grid : null;
    if (alreadySolved && data.solution?.length === NN && !(local && local.every(Boolean))) return data.solution.slice();
    return local || givens.slice();
  });
  const [notes, setNotes] = useState(() => (saved.notes?.length === NN ? saved.notes : Array.from({ length: NN }, () => [])));
  // Megoldott rácson nincs kijelölés (különben a bal felső cella kiemelése megtévesztő lenne).
  const [sel, setSel] = useState(() => (alreadySolved ? -1 : givens.findIndex((g) => !g)));
  const [noteMode, setNoteMode] = useState(false);
  // Kijelölés mód: egyszerre több cella jelölhető ki (koppintással ki-be), és a beírás mindegyikbe
  // bekerül (számnál és jegyzetnél is).
  const [multiMode, setMultiMode] = useState(false);
  const [multi, setMulti] = useState([]);
  // Húzásos kijelölés (Kijelölés nélkül is): nyomva tartva végighúzva több cella jelölődik ki; egy
  // sima koppintás (félrenyomás) után azonnal eltűnik. dragRef: a folyamatban lévő húzás.
  const [swipe, setSwipe] = useState([]);
  const dragRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [solved, setSolved] = useState(alreadySolved);
  const [msg, setMsg] = useState(null);
  const [wave, playWave] = useWinWave();
  const [completedAt, setCompletedAt] = useState(saved.completedAt || null);
  const start = useRef(Date.now() - (solvedTime ?? saved.elapsed ?? 0));
  const [elapsed, setElapsed] = useState(solvedTime ?? saved.elapsed ?? 0);
  const sending = useRef(false);

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setElapsed(Date.now() - start.current), 500);
    return () => clearInterval(t);
  }, [solved]);
  // A napi sudoku haladása (beírt számok, jegyzetek, idő) csak ezen az eszközön, a böngészőben
  // mentődik (a szervert nem terheli). A korábbi sudokuknál (compact) csak az, hogy megoldotta-e.
  useEffect(() => {
    if (preview) return;
    if (compact) {
      if (solved) saveDay(date, { solved, completedAt, elapsed }, N);
      return;
    }
    saveDay(date, { grid, notes, elapsed, solved, completedAt }, N);
  }, [date, grid, notes, elapsed, solved, preview, compact, completedAt, N]);

  const bad = useMemo(() => conflicts(grid), [grid]);
  // Azok a számok, amelyekből már mind az N be van írva: a gombjuk kiszürkül (de megnyomható marad,
  // hogy egy beírt szám újranyomással törölhető legyen).
  const complete = useMemo(() => new Set(digits.filter((d) => grid.filter((v) => v === d).length >= N)), [grid, digits, N]);
  const filled = grid.every(Boolean);

  // Kitöltött, ütközésmentes rács: mivel a rejtvénynek egyetlen megoldása van, ez a megoldás. A
  // szerver ezt még egyszer ellenőrzi.
  useEffect(() => {
    if (solved || !filled || bad.size || sending.current) return;
    // Azonnal megoldottnak jelöljük (konfetti), a szerver ellenőrzése a háttérben fut; ha mégsem
    // fogadná el, visszaáll a játék.
    const el = Date.now() - start.current;
    setSolved(true);
    setCompletedAt(Date.now());
    setSel(-1);
    setMultiMode(false);
    setMulti([]);
    setSwipe([]);
    playWave(10);
    setElapsed(el);
    fireConfetti();
    if (preview) return;
    sending.current = true;
    fetch('/api/sudoku/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, size: N, grid, elapsed: el, device: deviceId(), name: getIdentity().name }) })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok) onSolved && onSolved(el, d.stats);
        else {
          setSolved(false);
          setMsg(d.message || 'Valami nem stimmel – nézd át a számokat!');
        }
      })
      .catch(() => {
        setSolved(false);
        setMsg('Nem sikerült ellenőrizni, próbáld újra.');
      })
      .finally(() => (sending.current = false));
  }, [filled, bad, solved, grid, date, preview, onSolved]);

  // A beírás célcellái: kijelölés módban az összes kijelölt (a megadottak kivételével), egyébként a
  // kijelölt cella.
  const targets = useMemo(() => {
    const list = multiMode ? multi : swipe.length > 1 ? swipe : sel >= 0 ? [sel] : [];
    return list.filter((i) => i >= 0 && !givens[i]);
  }, [multiMode, multi, swipe, sel, givens]);
  const put = useCallback(
    (d) => {
      if (solved || !targets.length) return;
      setMsg(null);
      const T = new Set(targets);
      if (noteMode && d) {
        const empty = targets.filter((i) => !grid[i]);
        if (!empty.length) return;
        // Ha minden kijelölt üres cellában megvan a jelölt, kikerül; különben mindegyikbe bekerül.
        const all = empty.every((i) => notes[i].includes(d));
        setHistory((h) => [...h, { grid, notes }].slice(-200));
        setNotes((ns) => ns.map((n, i) => (!T.has(i) || grid[i] ? n : all ? n.filter((x) => x !== d) : n.includes(d) ? n : [...n, d].sort())));
        return;
      }
      // Ha a cellában (kijelölésnél mindegyikben) már ez a szám áll, újra megnyomva törlődik.
      if (d && targets.every((i) => grid[i] === d)) d = 0;
      if (!d && targets.every((i) => !grid[i] && !notes[i].length)) return;
      setHistory((h) => [...h, { grid, notes }].slice(-200));
      setGrid((g) => g.map((v, i) => (T.has(i) ? d : v)));
      // Szám beírásakor a cellák jegyzetei törlődnek, és a társaikból kikerül ez a jelölt.
      const peer = (i) => targets.some((t) => rowOf(i) === rowOf(t) || colOf(i) === colOf(t) || boxOf(i) === boxOf(t));
      if (d) setNotes((ns) => ns.map((n, i) => (T.has(i) ? [] : peer(i) ? n.filter((x) => x !== d) : n)));
      else setNotes((ns) => ns.map((n, i) => (T.has(i) ? [] : n)));
    },
    [solved, targets, noteMode, grid, notes, rowOf, colOf, boxOf],
  );
  function toggleMulti() {
    setMultiMode((m) => {
      if (m) {
        setMulti([]);
        return false;
      }
      setMulti(sel >= 0 && !givens[sel] ? [sel] : []);
      return true;
    });
  }
  function pick(i) {
    if (solved) return;
    setSel(i);
    if (!multiMode) {
      setSwipe([]);
      dragRef.current = { cells: [i], multi: false };
      return;
    }
    const had = multi.includes(i);
    dragRef.current = { cells: [i], multi: true, adding: !had };
    if (givens[i]) return;
    setMulti((m) => (had ? m.filter((x) => x !== i) : [...m, i]));
  }
  // Húzás közben a mutató alatti cella (érintésnél a mozgás az első cellához kötődik, ezért a
  // képernyő-koordinátából keressük meg).
  function dragMove(e) {
    const dr = dragRef.current;
    if (!dr || solved) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-cell]');
    if (!el) return;
    const i = Number(el.dataset.cell);
    if (dr.cells.includes(i)) return;
    dr.cells.push(i);
    if (dr.multi) {
      if (!givens[i]) setMulti((m) => (dr.adding ? (m.includes(i) ? m : [...m, i]) : m.filter((x) => x !== i)));
    } else setSwipe([...dr.cells]);
  }
  useEffect(() => {
    const end = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);
  const clearBoard = useCallback(() => {
    if (solved) return;
    setMsg(null);
    setHistory((h) => [...h, { grid, notes }].slice(-200));
    setGrid(givens.slice());
    setNotes(Array.from({ length: NN }, () => []));
  }, [solved, grid, notes, givens, NN]);
  const undo = useCallback(() => {
    if (solved || !history.length) return;
    const last = history[history.length - 1];
    setGrid(last.grid);
    setNotes(last.notes);
    setHistory(history.slice(0, -1));
  }, [solved, history]);

  // Gépi billentyűzet (mobilon nincs beviteli mező, így a telefon billentyűzete nem jön fel).
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('.modal-overlay')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        return undo();
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= N) {
        e.preventDefault();
        return put(Number(e.key));
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        return put(0);
      }
      if (e.key === 'n' || e.key === 'N') return setNoteMode((m) => !m);
      if (e.key === 'k' || e.key === 'K') return toggleMulti();
      const mv = { ArrowUp: -N, ArrowDown: N, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv) {
        setSwipe([]);
        e.preventDefault();
        setSel((s) => {
          const n = (s < 0 ? 0 : s) + mv;
          if (n < 0 || n > NN - 1) return s;
          if ((mv === 1 && colOf(s) === N - 1) || (mv === -1 && colOf(s) === 0)) return s;
          return n;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [put, undo, N, NN, colOf]);

  const dayLabel = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Gyakorlás';
  const selVal = sel >= 0 ? grid[sel] : 0;
  return (
    <div className="sudoku-game">
      {!compact && (
        <GameHead
          title="Napi Sudoku"
          number={number}
          level={level}
          dateLabel={dayLabel}
          time={fmt(elapsed)}
          lead={
            onSize ? (
              <span className="sudoku-sizes" role="group" aria-label="Rács mérete">
                {[6, 9].map((n) => (
                  <button key={n} type="button" className={`sudoku-size${n === N ? ' on' : ''}`} aria-pressed={n === N} onClick={() => n !== N && onSize(n)}>
                    {n}×{n}
                  </button>
                ))}
              </span>
            ) : null
          }
        />
      )}
      <div className={`sudoku-board s${N}${wave ? ' win-wave' : ''}`} role="grid" aria-label={`Sudoku rács (${N}×${N})`} onPointerMove={dragMove}>
        {digits.map((_, r) => (
          <div key={r} role="row" className="sudoku-row">
            {grid.slice(r * N, r * N + N).map((v, k) => {
              const i = r * N + k;
              const swiping = !multiMode && swipe.length > 1;
              const isSel = multiMode ? multi.includes(i) : swiping ? swipe.includes(i) : i === sel;
              const zone = !multiMode && !swiping && sel >= 0 && !isSel && (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel));
              const same = !isSel && selVal && v === selVal;
              const cls = [
                'sudoku-cell',
                givens[i] ? 'given' : 'user',
                isSel ? 'sel' : '',
                zone ? 'zone' : '',
                same ? 'same' : '',
                bad.has(i) ? 'bad' : '',
                colOf(i) % 3 === 2 && colOf(i) < N - 1 ? 'bx-r' : '',
                rowOf(i) % br === br - 1 && rowOf(i) < N - 1 ? 'bx-b' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={i}
                  role="gridcell"
                  aria-label={`${rowOf(i) + 1}. sor, ${colOf(i) + 1}. oszlop: ${v || 'üres'}${givens[i] ? ' (megadott)' : ''}${bad.has(i) ? ', ütközik' : ''}`}
                  aria-selected={isSel}
                  className={cls}
                  style={{ '--d': diagFromBottomLeft(rowOf(i), colOf(i), N) }}
                  data-cell={i}
                  onPointerDown={(e) => {
                    // Érintésnél a mutató ne ragadjon az első cellához (különben a húzás nem követhető).
                    if (e.pointerType !== 'mouse' && e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                    pick(i);
                  }}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && !e.buttons && !solved && !multiMode && !swipe.length && setSel(i)}
                >
                  {v ? (
                    v
                  ) : notes[i].length ? (
                    <span className="sudoku-notes">
                      {/* A jegyzetek mindig bal felülről, növekvő sorrendben követik egymást. */}
                      {digits.map((_, k) => {
                        const ns = [...notes[i]].sort((a, b) => a - b);
                        return <span key={k}>{ns[k] || ''}</span>;
                      })}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {msg && (
        <p className="feedback hint" role="status" style={{ marginLeft: 0 }}>
          {msg}
        </p>
      )}
      {!solved && (
        <div className={`sudoku-pad p${N}`} aria-label="Számbillentyűzet">
          {/* 6x6: 1 2 3 Törlés / 4 5 6 Vissza / Jegyzet. 9x9: 1–5 Törlés / 6–9 Vissza / Jegyzet
              (hat oszlop, hogy mobilon a rács alatt kiférjen). */}
          {(N === 9 ? [1, 2, 3, 4, 5] : [1, 2, 3]).map((d) => (
            <button key={d} type="button" className={`sudoku-key${complete.has(d) ? ' complete' : ''}`} onClick={() => put(d)} aria-label={complete.has(d) ? `${d} (mind beírva)` : undefined}>
              {d}
            </button>
          ))}
          <button type="button" className="sudoku-key alt" onClick={() => put(0)} aria-label="Törlés">
            <span aria-hidden="true">✕</span>
            <small>Törlés</small>
          </button>
          {(N === 9 ? [6, 7, 8, 9] : [4, 5, 6]).map((d) => (
            <button key={d} type="button" className={`sudoku-key${complete.has(d) ? ' complete' : ''}`} onClick={() => put(d)} aria-label={complete.has(d) ? `${d} (mind beírva)` : undefined}>
              {d}
            </button>
          ))}
          <button type="button" className="sudoku-key alt undo" onClick={undo} aria-label="Vissza" disabled={!history.length}>
            <span aria-hidden="true">↶</span>
            <small>Vissza</small>
          </button>
          {/* Fél-fél szélességben: Jegyzet és Kijelölés (több cella egyszerre); bekapcsolva kiemelve. */}
          <button type="button" className={`sudoku-key note half${noteMode ? ' on' : ''}`} aria-pressed={noteMode} onClick={() => setNoteMode((m) => !m)}>
            <span aria-hidden="true">✎</span> Jegyzet
          </button>
          <button type="button" className={`sudoku-key note half multi${multiMode ? ' on' : ''}`} aria-pressed={multiMode} onClick={toggleMulti}>
            <svg className="sudoku-multi-ico" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="9" y="9" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
            </svg>{' '}
            Kijelölés
          </button>
          {/* A tábla törlése: minden beírt szám és jegyzet törlődik (a Vissza gombbal visszahozható).
              Megfejtés után a billentyűzettel együtt eltűnik. */}
          <button type="button" className="sudoku-key note clear" onClick={clearBoard} disabled={!grid.some((v, i) => v && !givens[i]) && !notes.some((n) => n.length)}>
            Tábla törlése
          </button>
        </div>
      )}
      {solved && !preview && (
        <div className="result-actions game-result-actions">
          <CopyResultButton
            round
            text={[
              `Napi Sudoku ${N}×${N} #${number} – ${dayLabel}`,
              `Nehézség: ${level}/5`,
              `Megoldva ${new Date(saved.completedAt || completedAt || Date.now()).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' })}-kor, ${fmt(elapsed)} alatt`,
              N === 9 ? 'napititkos.hu/sudoku?m=9' : 'napititkos.hu/sudoku',
            ].join('\n')}
          />
          {/* A napi sudokunál: a következő még nem teljesített napi játék (a másik méret is ide tartozik). */}
          {!compact && <NextGameButton current={N === 9 ? 'sudoku9' : 'sudoku6'} />}
        </div>
      )}
    </div>
  );
}
