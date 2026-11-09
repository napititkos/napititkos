'use client';
import { useMemo, useRef, useState } from 'react';
import { afterType, arrowStep, backspaceStep, clickCell, jumpWord, navModel, wordOf } from '../lib/miniNav';

// Saját mini keresztrejtvény készítése (Közösségi rejtvények – Minik). Ugyanaz a kezelés, mint a
// játékban és az admin szerkesztőben (lib/miniNav.js), de generálás, automatikus kitöltés és
// kérdésbank-javaslat nélkül: mindent a játékos ír. Fekete négyzet: # vagy . billentyű, vagy a gomb.
const N = 5;
const HU = new Set(Array.from('aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz'));
const blank = () => Array.from({ length: N }, () => Array(N).fill(''));
const keyOf = (w) => `${w.dir}:${w.row}:${w.col}`;

export default function UserMiniEditor({ onDone }) {
  const [rows, setRows] = useState(blank);
  const [cur, setCur] = useState({ r: 0, c: 0, dir: 'A' });
  const [clues, setClues] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const inputRef = useRef(null);
  const m = useMemo(() => navModel(rows), [rows]);
  const curWord = wordOf(m, cur);
  const focusInput = () => inputRef.current?.focus({ preventScroll: true });

  const setCell = (r, c, v) => setRows((prev) => prev.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));

  function toggleBlack() {
    const next = rows.map((row, i) => (i === cur.r ? row.map((x, j) => (j === cur.c ? (x === '#' ? '' : '#') : x)) : row));
    setRows(next);
    setMsg(null);
  }

  function typeLetter(ch) {
    const low = ch.toLowerCase();
    if (!HU.has(low)) return;
    const next = rows.map((row, i) => (i === cur.r ? row.map((x, j) => (j === cur.c ? low : x)) : row));
    setRows(next);
    const nm = navModel(next);
    const c0 = { ...cur, dir: nm.at[`${cur.r},${cur.c}`]?.[cur.dir] ? cur.dir : cur.dir === 'A' ? 'D' : 'A' };
    setCur(afterType(nm, next, c0));
    setMsg(null);
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const act = (fn) => {
      e.preventDefault();
      fn();
    };
    const black = rows[cur.r][cur.c] === '#';
    const plain = (dr, dc) => setCur({ r: Math.min(N - 1, Math.max(0, cur.r + dr)), c: Math.min(N - 1, Math.max(0, cur.c + dc)), dir: dr ? 'D' : 'A' });
    const move = (dr, dc) => (black ? plain(dr, dc) : setCur(arrowStep(m, cur, dr, dc)));
    if (k === 'ArrowLeft') act(() => move(0, -1));
    else if (k === 'ArrowRight') act(() => move(0, 1));
    else if (k === 'ArrowUp') act(() => move(-1, 0));
    else if (k === 'ArrowDown') act(() => move(1, 0));
    else if (k === 'Tab' && !black) act(() => setCur(jumpWord(m, rows, cur, e.shiftKey ? -1 : 1)));
    else if (k === ' ' && !black) act(() => setCur(clickCell(m, cur, cur.r, cur.c)));
    else if (k === '#' || k === '.') act(toggleBlack);
    else if (k === 'Backspace' || k === 'Delete')
      act(() => {
        if (black) return setCell(cur.r, cur.c, '');
        const { clear, cur: nc } = backspaceStep(m, rows, cur);
        if (clear) setCell(clear[0], clear[1], '');
        setCur(nc);
      });
    else if (k.length === 1 && HU.has(k.toLowerCase())) act(() => typeLetter(k));
  }
  function onInput(e) {
    const v = e.target.value;
    e.target.value = '';
    const ch = Array.from(v || '').pop();
    if (ch === '#' || ch === '.') toggleBlack();
    else if (ch) typeLetter(ch);
  }
  function clickAt(r, c) {
    if (rows[r][c] === '#') setCur({ r, c, dir: cur.dir });
    else setCur(clickCell(m, cur, r, c));
    focusInput();
  }

  const words = m.words.slice().sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === 'A' ? -1 : 1));
  const wordText = (w) => w.cells.map(([r, c]) => rows[r][c]).join('');
  const complete = (w) => w.cells.every(([r, c]) => rows[r][c] && rows[r][c] !== '#');
  const empties = rows.flat().filter((x) => x === '').length;
  const allWords = words.map(wordText);
  const dup = allWords.filter((w, i) => w && allWords.indexOf(w) !== i);
  const ready = words.length > 0 && empties === 0 && words.every((w) => (clues[keyOf(w)] || '').trim()) && !dup.length;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setMsg(null);
    const entries = words.map((w) => ({ dir: w.dir, row: w.row, col: w.col, word: wordText(w), clue: clues[keyOf(w)].trim() }));
    const r = await fetch('/api/community/minis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, entries }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) onDone && onDone(d.id);
    else setMsg({ ok: false, text: d.message || 'Nem sikerült beküldeni.' });
  }

  const inWord = (r, c) => !!curWord && curWord.cells.some(([a, b]) => a === r && b === c);
  return (
    <div className="mini-user-editor">
      <p className="mini-muted">
        Kattints egy négyzetre, és írd be a betűket (ugyanarra újra kattintva irányt váltasz, a Tab a következő szóra ugrik). Fekete négyzet: <kbd>#</kbd> vagy <kbd>.</kbd> billentyű, vagy a gomb. Minden betű külön négyzet (a kettős betű kettő).
      </p>
      <div className="mini-board-wrap" style={{ maxWidth: 360, margin: '0 auto' }}>
        <div className="mini-board" role="grid" aria-label="Saját mini rács" onClick={focusInput}>
          {rows.map((row, r) => (
            <div key={r} role="row" className="mini-board-row">
              {row.map((ch, c) => (
                <span
                  key={c}
                  role="gridcell"
                  aria-selected={r === cur.r && c === cur.c}
                  aria-label={`${r + 1}. sor, ${c + 1}. oszlop: ${ch === '#' ? 'fekete' : ch ? ch.toUpperCase() : 'üres'}`}
                  className={`mini-sq${ch === '#' ? ' black' : ''}${ch !== '#' && inWord(r, c) ? ' word' : ''}${r === cur.r && c === cur.c ? ' active' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    clickAt(r, c);
                  }}
                >
                  {ch !== '#' && m.nums[`${r},${c}`] && <span className="mini-sq-num">{m.nums[`${r},${c}`]}</span>}
                  <span className="mini-sq-ch">{ch === '#' ? '' : ch.toUpperCase()}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <input ref={inputRef} className="mini-hidden-input" aria-label="Betű beírása" inputMode="text" enterKeyHint="done" autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} onKeyDown={onKeyDown} onInput={onInput} />
      </div>
      <div className="mini-list-actions">
        <button type="button" className="ghost small" onClick={() => { toggleBlack(); focusInput(); }}>
          {rows[cur.r][cur.c] === '#' ? 'Fehér négyzet' : 'Fekete négyzet'}
        </button>
        <button type="button" className="ghost small danger" onClick={() => { if (confirm('Törlöd a rácsot és a kérdéseket?')) { setRows(blank()); setClues({}); } }}>
          Rács törlése
        </button>
      </div>
      {['A', 'D'].map((d) => (
        <div key={d} className="mini-clues">
          <h3>{d === 'A' ? 'Vízszintes' : 'Függőleges'}</h3>
          {words.filter((w) => w.dir === d).map((w) => (
            <div key={keyOf(w)} className="mini-clue-row">
              <label className="field-label" htmlFor={`um-${keyOf(w)}`}>
                <b>{w.num}.</b> {complete(w) ? wordText(w).toUpperCase() : <i>(még nincs kész)</i>} <span className="mini-len">({w.cells.length})</span>
              </label>
              <textarea id={`um-${keyOf(w)}`} rows={2} maxLength={300} value={clues[keyOf(w)] || ''} placeholder="Írd ide a kérdést…" onChange={(e) => setClues((cl) => ({ ...cl, [keyOf(w)]: e.target.value }))} />
            </div>
          ))}
        </div>
      ))}
      {dup.length > 0 && <p className="feedback hint" style={{ marginLeft: 0 }}>Egy szó nem szerepelhet kétszer: {[...new Set(dup)].map((w) => w.toUpperCase()).join(', ')}</p>}
      {msg && <p className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0 }} role="status">{msg.text}</p>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
        <button className="primary" onClick={submit} disabled={!ready || busy}>
          {busy ? 'Beküldés…' : 'Beküldés'}
        </button>
        {!ready && <span className="mini-muted">A beküldéshez töltsd ki az összes négyzetet (betű vagy fekete), és írj kérdést minden szóhoz.</span>}
      </div>
    </div>
  );
}
