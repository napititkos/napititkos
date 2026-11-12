'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { conflicts } from '../lib/sudokuGen';
import { deviceId } from '../lib/device';
import { fireConfetti } from './Confetti';
import ShareButton from './ShareButton';
import { getIdentity } from '../lib/identity';

// Napi mini sudoku (6x6). Saját számbillentyűzettel (1–6, Törlés, Vissza, Jegyzet), hogy mobilon ne
// jöjjön fel a telefon billentyűzete; gépen a billentyűzet is működik (1–6, Backspace/Delete,
// nyilak, N = jegyzet, Ctrl+Z = vissza), és az egér alatti cella kijelölődik. A kijelölt cella
// sora, oszlopa és doboza halványan, maga a cella erősebben ki van emelve. Az ütköző számok
// pirosak. A rács kitöltésekor a szerver ellenőrzi a megoldást.
//   preview: admin kipróbálás és Kisokos – semmi nem mentődik
//   compact: korábbi sudokuknál nincs sorszám, dátum és időzítő a rács fölött
const KEY = 'titkositas_sudoku_v1';
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
const saveDay = (date, v) => {
  try {
    const all = loadAll();
    all[date] = v;
    const keys = Object.keys(all).sort();
    while (keys.length > 60) delete all[keys.shift()];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
};
const rowOf = (i) => Math.floor(i / 6);
const colOf = (i) => i % 6;
const boxOf = (i) => Math.floor(rowOf(i) / 2) * 2 + Math.floor(colOf(i) / 3);

export default function SudokuGame({ data, onSolved, preview = false, compact = false, solvedTime = null }) {
  const { date, givens, level, number } = data;
  const saved = useMemo(() => (preview ? {} : loadAll()[date] || {}), [date, preview]);
  const alreadySolved = solvedTime != null || !!saved.solved;
  // Megoldott napnál, ha az eszközön nincs meg a kitöltés (pl. másik eszközön oldotta meg), a
  // szervertől kapott megoldás látszik – így soha nem jelenik meg üresen a megoldott rács.
  const [grid, setGrid] = useState(() => {
    const local = saved.grid?.length === 36 ? saved.grid : null;
    if (alreadySolved && data.solution?.length === 36 && !(local && local.every(Boolean))) return data.solution.slice();
    return local || givens.slice();
  });
  const [notes, setNotes] = useState(() => (saved.notes?.length === 36 ? saved.notes : Array.from({ length: 36 }, () => [])));
  const [sel, setSel] = useState(() => givens.findIndex((g) => !g));
  const [noteMode, setNoteMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [solved, setSolved] = useState(alreadySolved);
  const [msg, setMsg] = useState(null);
  const start = useRef(Date.now() - (solvedTime ?? saved.elapsed ?? 0));
  const [elapsed, setElapsed] = useState(solvedTime ?? saved.elapsed ?? 0);
  const sending = useRef(false);

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setElapsed(Date.now() - start.current), 500);
    return () => clearInterval(t);
  }, [solved]);
  useEffect(() => {
    if (preview) return;
    saveDay(date, { grid, notes, elapsed, solved });
  }, [date, grid, notes, elapsed, solved, preview]);

  const bad = useMemo(() => conflicts(grid), [grid]);
  const filled = grid.every(Boolean);

  // Kitöltött, ütközésmentes rács: mivel a rejtvénynek egyetlen megoldása van, ez a megoldás. A
  // szerver ezt még egyszer ellenőrzi.
  useEffect(() => {
    if (solved || !filled || bad.size || sending.current) return;
    // Azonnal megoldottnak jelöljük (konfetti), a szerver ellenőrzése a háttérben fut; ha mégsem
    // fogadná el, visszaáll a játék.
    const el = Date.now() - start.current;
    setSolved(true);
    setElapsed(el);
    fireConfetti();
    if (preview) return;
    sending.current = true;
    fetch('/api/sudoku/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, grid, elapsed: el, device: deviceId(), name: getIdentity().name }) })
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

  const put = useCallback(
    (d) => {
      if (solved || sel < 0 || givens[sel]) return;
      setMsg(null);
      if (noteMode && d) {
        if (grid[sel]) return;
        setHistory((h) => [...h, { grid, notes }].slice(-200));
        setNotes((ns) => ns.map((n, i) => (i === sel ? (n.includes(d) ? n.filter((x) => x !== d) : [...n, d].sort()) : n)));
        return;
      }
      if (grid[sel] === d && !notes[sel].length) return;
      setHistory((h) => [...h, { grid, notes }].slice(-200));
      setGrid((g) => g.map((v, i) => (i === sel ? d : v)));
      // Szám beírásakor a cella jegyzetei törlődnek, és a társaiból kikerül ez a jelölt.
      if (d) setNotes((ns) => ns.map((n, i) => (i === sel ? [] : rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel) ? n.filter((x) => x !== d) : n)));
      else setNotes((ns) => ns.map((n, i) => (i === sel ? [] : n)));
    },
    [solved, sel, givens, noteMode, grid, notes],
  );
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
      if (/^[1-6]$/.test(e.key)) {
        e.preventDefault();
        return put(Number(e.key));
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        return put(0);
      }
      if (e.key === 'n' || e.key === 'N') return setNoteMode((m) => !m);
      const mv = { ArrowUp: -6, ArrowDown: 6, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv) {
        e.preventDefault();
        setSel((s) => {
          const n = (s < 0 ? 0 : s) + mv;
          if (n < 0 || n > 35) return s;
          if ((mv === 1 && colOf(s) === 5) || (mv === -1 && colOf(s) === 0)) return s;
          return n;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [put, undo]);

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
        <div className="szo-top sudoku-top">
          <span className="szo-date">
            {number > 0 && <span className="szo-dayno">#{number} </span>}
            {dayLabel}
          </span>
          <span className="sudoku-level" aria-label={`Nehézség: ${level}/5`}>
            Nehézség: <b>{level}/5</b>
          </span>
          <span className="timer">{fmt(elapsed)}</span>
        </div>
      )}
      <div className="sudoku-board" role="grid" aria-label="Sudoku rács">
        {[0, 1, 2, 3, 4, 5].map((r) => (
          <div key={r} role="row" className="sudoku-row">
            {grid.slice(r * 6, r * 6 + 6).map((v, k) => {
              const i = r * 6 + k;
              const isSel = i === sel;
              const zone = sel >= 0 && !isSel && (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel));
              const same = !isSel && selVal && v === selVal;
              const cls = [
                'sudoku-cell',
                givens[i] ? 'given' : 'user',
                isSel ? 'sel' : '',
                zone ? 'zone' : '',
                same ? 'same' : '',
                bad.has(i) ? 'bad' : '',
                colOf(i) === 2 ? 'bx-r' : '',
                rowOf(i) === 1 || rowOf(i) === 3 ? 'bx-b' : '',
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
                  onPointerDown={() => setSel(i)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && !solved && setSel(i)}
                >
                  {v ? (
                    v
                  ) : notes[i].length ? (
                    <span className="sudoku-notes">
                      {[1, 2, 3, 4, 5, 6].map((d) => (
                        <span key={d}>{notes[i].includes(d) ? d : ''}</span>
                      ))}
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
        <div className="sudoku-pad" aria-label="Számbillentyűzet">
          {[1, 2, 3].map((d) => (
            <button key={d} type="button" className="sudoku-key" onClick={() => put(d)}>
              {d}
            </button>
          ))}
          <button type="button" className="sudoku-key alt" onClick={() => put(0)} aria-label="Törlés">
            <span aria-hidden="true">✕</span>
            <small>Törlés</small>
          </button>
          {[4, 5, 6].map((d) => (
            <button key={d} type="button" className="sudoku-key" onClick={() => put(d)}>
              {d}
            </button>
          ))}
          <button type="button" className="sudoku-key alt" onClick={undo} aria-label="Vissza" disabled={!history.length}>
            <span aria-hidden="true">↶</span>
            <small>Vissza</small>
          </button>
          <button type="button" className={`sudoku-key note${noteMode ? ' on' : ''}`} aria-pressed={noteMode} onClick={() => setNoteMode((m) => !m)}>
            ✎ Jegyzet {noteMode ? 'be' : 'ki'}
          </button>
        </div>
      )}
      {solved && !preview && (
        <div className="szo-share">
          <ShareButton text={`Napi sudoku #${number}\nMegoldottam ${fmt(elapsed)} alatt (nehézség: ${level}/5)!\nPróbáld ki te is: https://napititkos.hu/sudoku`} />
        </div>
      )}
    </div>
  );
}
