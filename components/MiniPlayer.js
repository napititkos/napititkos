'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { afterType, arrowStep, backspaceStep, clickCell, firstEmpty, jumpWord, navModel, wordOf } from '../lib/miniNav';

// Mini keresztrejtvény játékfelülete (5x5), a NYT Mini kezelését követve. A navigáció a
// szerkesztővel közös (lib/miniNav.js):
// - egy négyzetre koppintva kijelölődik, és vele az egész szó (sor vagy oszlop); az aktív
//   négyzet erősebben kiemelve. Ugyanarra a négyzetre újra koppintva sor <-> oszlop váltás.
// - gépeléskor a betű beíródik (a meglévőt felülírja), és a szó következő üres négyzetére lép;
//   ha a szó betelt, a következő szó első üres négyzetére ugrik.
// - Backspace: törli az aktív négyzetet, üres négyzetnél visszalép és ott töröl (a szó elején
//   az előző szó utolsó négyzetére).
// - Nyilak: mozgás; a szóiránnyal ellentétes nyíl először csak irányt vált. Szóköz: irányváltás.
//   Tab / Shift+Tab: következő / előző szó. Enter: ellenőrzés.
// - Ellenőrzés: a beírt jó betűk zöldes, a beírt rossz betűk pirosas hátteret kapnak.
// - Ha minden betű jó, a rejtvény magától teljesül.
// - A négyzetek nem jelölhetők ki, nincs kurzor; mobilon egy rejtett mező hozza elő a billentyűzetet.
const DIRS = { A: 'Vízszintes', D: 'Függőleges' };
const HU = new Set(Array.from('AÁBCDEÉFGHIÍJKLMNOÓÖŐPQRSTUÚÜŰVWXYZ'));

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// solvedTime: ha már megfejtette (pl. korábban ezen a héten), a kitöltött rács és az ideje látszik.
export default function MiniPlayer({ rows, entries, onSolved, solvedTime = null }) {
  const m = useMemo(() => navModel(rows), [rows]);
  const { nums, words, order } = m;
  const isBlack = m.black;
  // A kérdések a szavakhoz rendelve (irány + kezdőpont szerint).
  const clueOf = useMemo(() => {
    const out = {};
    for (const w of words) out[w.i] = entries.find((x) => x.dir === w.dir && x.row === w.row && x.col === w.col)?.clue || '';
    return out;
  }, [words, entries]);
  const solution = useMemo(() => rows.map((row) => row.map((ch) => (ch === '#' ? '#' : String(ch).toUpperCase()))), [rows]);
  const first = words[order[0]] || words[0];
  const [cur, setCur] = useState({ r: first.cells[0][0], c: first.cells[0][1], dir: first.dir });
  const already = solvedTime != null;
  const [fill, setFill] = useState(() => rows.map((row) => row.map((ch) => (ch === '#' ? '#' : already ? String(ch).toUpperCase() : ''))));
  const [marks, setMarks] = useState({}); // ellenőrzés: "r,c" -> 'ok' | 'bad'
  const [msg, setMsg] = useState(already ? { ok: true, text: `Megfejtetted! Időd: ${fmt(solvedTime)}` } : null);
  const [solved, setSolved] = useState(already);
  const [start] = useState(() => Date.now() - (already ? solvedTime : 0));
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [solved]);

  const curWord = wordOf(m, cur) || first;
  const focusInput = () => inputRef.current?.focus({ preventScroll: true });
  const isFull = (f) => f.every((row, r) => row.every((v, c) => isBlack(r, c) || v));
  const isCorrect = (f) => f.every((row, r) => row.every((v, c) => isBlack(r, c) || v === solution[r][c]));

  function clearMark(r, c) {
    setMarks((mk) => {
      if (!mk[`${r},${c}`]) return mk;
      const x = { ...mk };
      delete x[`${r},${c}`];
      return x;
    });
  }

  function finish(f) {
    if (!isFull(f)) return;
    if (isCorrect(f)) {
      const t = Date.now() - start;
      setSolved(true);
      setNow(Date.now());
      setMarks({});
      setMsg({ ok: true, text: `Megfejtetted! Időd: ${fmt(t)}` });
      onSolved && onSolved(t);
    } else {
      setMsg({ ok: false, text: 'Majdnem! Valahol még hiba van – az Ellenőrzés megmutatja, hol.' });
    }
  }

  function typeLetter(ch) {
    if (solved) return;
    const L = ch.toUpperCase();
    if (!HU.has(L)) return;
    const next = fill.map((row) => [...row]);
    next[cur.r][cur.c] = L;
    setFill(next);
    clearMark(cur.r, cur.c);
    setMsg(null);
    setCur(afterType(m, next, cur));
    finish(next);
  }

  function backspace() {
    if (solved) return;
    const { clear, cur: nc } = backspaceStep(m, fill, cur);
    if (clear) {
      const next = fill.map((row) => [...row]);
      next[clear[0]][clear[1]] = '';
      setFill(next);
      clearMark(clear[0], clear[1]);
    }
    setCur(nc);
    setMsg(null);
  }

  // Ellenőrzés: a beírt és jó betűk zöldesek, a beírt és rossz betűk pirosasak lesznek
  // (az üres négyzetek változatlanok). Kitöltés előtt is használható.
  function check() {
    if (solved) return;
    const mk = {};
    let bad = 0;
    let ok = 0;
    fill.forEach((row, r) =>
      row.forEach((v, c) => {
        if (isBlack(r, c) || !v) return;
        if (v === solution[r][c]) {
          mk[`${r},${c}`] = 'ok';
          ok++;
        } else {
          mk[`${r},${c}`] = 'bad';
          bad++;
        }
      })
    );
    setMarks(mk);
    if (!ok && !bad) setMsg({ ok: false, text: 'Még nincs beírt betű.' });
    else if (bad) setMsg({ ok: false, text: `${bad} betű nem jó (pirossal jelölve).` });
    else if (!isFull(fill)) setMsg({ ok: true, text: 'Eddig minden beírt betű jó!' });
    else finish(fill);
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const act = (fn) => {
      e.preventDefault();
      fn();
    };
    if (k === 'Backspace' || k === 'Delete') act(backspace);
    else if (k === 'ArrowLeft') act(() => setCur(arrowStep(m, cur, 0, -1)));
    else if (k === 'ArrowRight') act(() => setCur(arrowStep(m, cur, 0, 1)));
    else if (k === 'ArrowUp') act(() => setCur(arrowStep(m, cur, -1, 0)));
    else if (k === 'ArrowDown') act(() => setCur(arrowStep(m, cur, 1, 0)));
    else if (k === 'Tab') act(() => setCur(jumpWord(m, fill, cur, e.shiftKey ? -1 : 1)));
    else if (k === ' ') act(() => setCur(clickCell(m, cur, cur.r, cur.c)));
    else if (k === 'Enter') act(check);
    else if (k.length === 1 && HU.has(k.toUpperCase())) act(() => typeLetter(k));
  }

  // Mobilon (és ékezetes, összetett bevitelnél) a rejtett mező input eseményéből olvassuk a betűt.
  function onInput(e) {
    const v = e.target.value;
    e.target.value = '';
    if (!v) return;
    const ch = Array.from(v).pop();
    if (HU.has(ch.toUpperCase())) typeLetter(ch);
  }

  const clickAt = (r, c) => {
    setCur(clickCell(m, cur, r, c));
    focusInput();
  };
  const jump = (d) => {
    setCur(jumpWord(m, fill, cur, d));
    focusInput();
  };
  const inWord = (r, c) => curWord.cells.some(([a, b]) => a === r && b === c);
  const dirWords = (d) => words.filter((w) => w.dir === d).sort((a, b) => a.num - b.num);

  return (
    <div className="mini-player">
      <div className="mini-player-top">
        <span className="timer">{fmt(now - start)}</span>
        <button type="button" className="ghost small" onClick={check} disabled={solved}>
          Ellenőrzés
        </button>
      </div>
      <div className="mini-cluebar">
        <button type="button" className="mini-cluebar-nav" aria-label="Előző szó" onClick={() => jump(-1)}>
          ‹
        </button>
        <div className="mini-cluebar-text" aria-live="polite">
          <b>
            {curWord.num}
            {curWord.dir === 'A' ? 'V' : 'F'}
          </b>{' '}
          {clueOf[curWord.i]}
        </div>
        <button type="button" className="mini-cluebar-nav" aria-label="Következő szó" onClick={() => jump(1)}>
          ›
        </button>
      </div>
      <div className="mini-board-wrap">
        <div className="mini-board" role="grid" aria-label="Mini keresztrejtvény" onClick={focusInput}>
          {rows.map((row, r) => (
            <div key={r} role="row" className="mini-board-row">
              {row.map((_, c) =>
                isBlack(r, c) ? (
                  <span key={c} role="gridcell" aria-label="fekete négyzet" className="mini-sq black" />
                ) : (
                  <span
                    key={c}
                    role="gridcell"
                    aria-selected={r === cur.r && c === cur.c}
                    aria-label={`${nums[`${r},${c}`] ? nums[`${r},${c}`] + '. ' : ''}${fill[r][c] || 'üres'}${marks[`${r},${c}`] === 'bad' ? ', hibás' : marks[`${r},${c}`] === 'ok' ? ', jó' : ''}`}
                    className={`mini-sq${inWord(r, c) ? ' word' : ''}${r === cur.r && c === cur.c ? ' active' : ''}${marks[`${r},${c}`] ? ` ${marks[`${r},${c}`]}` : ''}${solved ? ' solved' : ''}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      clickAt(r, c);
                    }}
                  >
                    {nums[`${r},${c}`] && <span className="mini-sq-num">{nums[`${r},${c}`]}</span>}
                    <span className="mini-sq-ch">{fill[r][c]}</span>
                  </span>
                )
              )}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          className="mini-hidden-input"
          aria-label="Betű beírása"
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          onKeyDown={onKeyDown}
          onInput={onInput}
        />
      </div>
      {msg && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} role="status" style={{ marginLeft: 0 }}>
          {msg.text}
        </div>
      )}
      <div className="mini-cluelists">
        {['A', 'D'].map((d) => (
          <div key={d} className="mini-cluelist">
            <h3>{DIRS[d]}</h3>
            <ol>
              {dirWords(d).map((w) => (
                <li
                  key={w.i}
                  className={`${w.i === curWord.i ? 'active' : ''}${w.cells.every(([r, c]) => fill[r][c]) ? ' done' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setCur(firstEmpty(m, fill, w));
                    focusInput();
                  }}
                >
                  <b>{w.num}</b> {clueOf[w.i]}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
