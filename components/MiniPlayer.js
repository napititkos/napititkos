'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Mini keresztrejtvény játékfelülete (5x5), a NYT Mini kezelését követve:
// - egy négyzetre koppintva kijelölődik, és vele az egész szó (sor vagy oszlop); az aktív
//   négyzet erősebben kiemelve. Ugyanarra a négyzetre újra koppintva sor <-> oszlop váltás.
// - gépeléskor a betű beíródik (a meglévőt felülírja), és a szó következő üres négyzetére lép;
//   ha a szó betelt, a következő szó első üres négyzetére ugrik.
// - Backspace: törli az aktív négyzetet, üres négyzetnél visszalép és ott töröl (a szó elején
//   az előző szó utolsó négyzetére).
// - Nyilak: mozgás; a szóiránnyal ellentétes nyíl először csak irányt vált. Szóköz: irányváltás.
//   Tab / Shift+Tab: következő / előző szó. Enter: ellenőrzés.
// - Fent a kérdéssáv (az aktív szó kérdése, lapozó nyilakkal), lent a kérdések listája.
// - A négyzetek nem jelölhetők ki, nincs kurzor; mobilon egy rejtett mező hozza elő a billentyűzetet.
const DIRS = { A: 'Vízszintes', D: 'Függőleges' };
const HU = new Set(Array.from('AÁBCDEÉFGHIÍJKLMNOÓÖŐPQRSTUÚÜŰVWXYZ'));

function buildModel(rows, entries) {
  const n = rows.length;
  const isBlack = (r, c) => r < 0 || c < 0 || r >= n || c >= n || rows[r][c] === '#';
  const nums = {};
  let k = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (!isBlack(r, c) && (isBlack(r, c - 1) || isBlack(r - 1, c))) nums[`${r},${c}`] = ++k;
  const words = entries.map((e, i) => {
    const cells = Array.from({ length: e.len || Array.from(e.word).length }, (_, j) => (e.dir === 'A' ? [e.row, e.col + j] : [e.row + j, e.col]));
    return { i, dir: e.dir, num: nums[`${e.row},${e.col}`], clue: e.clue || '', cells, answer: Array.from(e.word.toUpperCase()) };
  });
  // Négyzetenként: melyik vízszintes és melyik függőleges szóhoz tartozik.
  const at = {};
  for (const w of words) w.cells.forEach(([r, c], j) => ((at[`${r},${c}`] = at[`${r},${c}`] || {})[w.dir] = { w: w.i, j }));
  // Sorrend (lista, Tab): előbb a vízszintesek, aztán a függőlegesek, mindkettő sorszám szerint.
  const byNum = (d) => words.filter((w) => w.dir === d).sort((a, b) => a.num - b.num);
  const order = [...byNum('A'), ...byNum('D')].map((w) => w.i);
  return { n, isBlack, nums, words, at, order };
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MiniPlayer({ rows, entries, onSolved }) {
  const model = useMemo(() => buildModel(rows, entries), [rows, entries]);
  const { n, isBlack, nums, words, at, order } = model;
  const first = words[order[0]] || words[0];
  const [cur, setCur] = useState({ r: first.cells[0][0], c: first.cells[0][1], dir: first.dir });
  const [fill, setFill] = useState(() => rows.map((row) => row.map(() => '')));
  const [wrong, setWrong] = useState({});
  const [msg, setMsg] = useState(null);
  const [solved, setSolved] = useState(false);
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [solved]);

  const wordAt = (r, c, dir) => at[`${r},${c}`]?.[dir];
  const curWord = words[wordAt(cur.r, cur.c, cur.dir)?.w ?? 0];
  const focusInput = () => inputRef.current?.focus({ preventScroll: true });

  const select = useCallback(
    (r, c, dir) => {
      if (isBlack(r, c)) return;
      const d = at[`${r},${c}`]?.[dir] ? dir : dir === 'A' ? 'D' : 'A';
      setCur({ r, c, dir: d });
      focusInput();
    },
    [at, isBlack]
  );

  function clickCell(r, c) {
    if (isBlack(r, c)) return;
    if (r === cur.r && c === cur.c) select(r, c, cur.dir === 'A' ? 'D' : 'A');
    else select(r, c, cur.dir);
  }

  // A szó (vagy a következő szavak) első üres négyzete a megadott pozíciótól.
  function nextEmpty(f, wi, fromJ) {
    const w = words[wi];
    for (let j = fromJ; j < w.cells.length; j++) if (!f[w.cells[j][0]][w.cells[j][1]]) return { wi, j };
    for (let j = 0; j < fromJ; j++) if (!f[w.cells[j][0]][w.cells[j][1]]) return { wi, j };
    const pos = order.indexOf(wi);
    for (let k = 1; k <= order.length; k++) {
      const ow = words[order[(pos + k) % order.length]];
      const j = ow.cells.findIndex(([r, c]) => !f[r][c]);
      if (j >= 0) return { wi: ow.i, j };
    }
    return null;
  }

  function moveTo(wi, j) {
    const w = words[wi];
    setCur({ r: w.cells[j][0], c: w.cells[j][1], dir: w.dir });
  }

  function typeLetter(ch) {
    if (solved) return;
    const L = ch.toUpperCase();
    if (!HU.has(L)) return;
    const next = fill.map((row) => [...row]);
    next[cur.r][cur.c] = L;
    setFill(next);
    setWrong((w) => {
      const x = { ...w };
      delete x[`${cur.r},${cur.c}`];
      return x;
    });
    setMsg(null);
    const pos = wordAt(cur.r, cur.c, cur.dir);
    const w = words[pos.w];
    // A szóban előre: a következő üres négyzet (ha nincs, a szó következő négyzete, végül a következő szó).
    let target = null;
    for (let j = pos.j + 1; j < w.cells.length; j++) if (!next[w.cells[j][0]][w.cells[j][1]]) { target = { wi: w.i, j }; break; }
    if (!target) {
      const allFull = w.cells.every(([r, c]) => next[r][c]);
      target = allFull ? nextEmpty(next, w.i, w.cells.length) : nextEmpty(next, w.i, 0);
    }
    if (target) moveTo(target.wi, target.j);
    if (next.every((row, r) => row.every((v, c) => isBlack(r, c) || v))) checkAll(next, true);
  }

  function backspace() {
    if (solved) return;
    const next = fill.map((row) => [...row]);
    if (next[cur.r][cur.c]) {
      next[cur.r][cur.c] = '';
    } else {
      const pos = wordAt(cur.r, cur.c, cur.dir);
      const w = words[pos.w];
      if (pos.j > 0) {
        const [r, c] = w.cells[pos.j - 1];
        next[r][c] = '';
        setCur({ r, c, dir: cur.dir });
      } else {
        // A szó elején: az előző szó utolsó négyzetére lép, és ott töröl (mint a NYT Miniben).
        const k = order.indexOf(w.i);
        const pw = words[order[(k - 1 + order.length) % order.length]];
        const [r, c] = pw.cells[pw.cells.length - 1];
        next[r][c] = '';
        setCur({ r, c, dir: pw.dir });
      }
    }
    setFill(next);
    setMsg(null);
  }

  function arrow(dr, dc) {
    const dir = dr ? 'D' : 'A';
    if (dir !== cur.dir && wordAt(cur.r, cur.c, dir)) return setCur({ ...cur, dir });
    let r = cur.r + dr, c = cur.c + dc;
    while (r >= 0 && c >= 0 && r < n && c < n && isBlack(r, c)) { r += dr; c += dc; }
    if (r >= 0 && c >= 0 && r < n && c < n) setCur({ r, c, dir: cur.dir });
  }

  function jumpWord(delta) {
    const pos = order.indexOf(curWord.i);
    const w = words[order[(pos + delta + order.length) % order.length]];
    const j = Math.max(0, w.cells.findIndex(([r, c]) => !fill[r][c]));
    moveTo(w.i, j);
    focusInput();
  }

  function checkAll(f = fill, auto = false) {
    const full = f.every((row, r) => row.every((v, c) => isBlack(r, c) || v));
    if (!full) {
      if (!auto) setMsg({ ok: false, text: 'Töltsd ki az összes négyzetet!' });
      return;
    }
    const bad = {};
    for (const w of words) w.cells.forEach(([r, c], j) => f[r][c] !== w.answer[j] && (bad[`${r},${c}`] = true));
    if (Object.keys(bad).length) {
      setWrong(bad);
      setMsg({ ok: false, text: auto ? 'Majdnem! Valahol hiba van – a hibás betűket jelöltük.' : 'Valahol hiba van – a hibás betűket jelöltük.' });
    } else {
      setSolved(true);
      setWrong({});
      const t = Date.now() - start;
      setNow(Date.now());
      setMsg({ ok: true, text: `Megfejtetted! Időd: ${fmt(t)}` });
      onSolved && onSolved(t);
    }
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); backspace(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); arrow(0, -1); }
    else if (k === 'ArrowRight') { e.preventDefault(); arrow(0, 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); arrow(-1, 0); }
    else if (k === 'ArrowDown') { e.preventDefault(); arrow(1, 0); }
    else if (k === 'Tab') { e.preventDefault(); jumpWord(e.shiftKey ? -1 : 1); }
    else if (k === ' ') { e.preventDefault(); select(cur.r, cur.c, cur.dir === 'A' ? 'D' : 'A'); }
    else if (k === 'Enter') { e.preventDefault(); checkAll(); }
    else if (k.length === 1 && HU.has(k.toUpperCase())) { e.preventDefault(); typeLetter(k); }
  }

  // Mobilon (és ékezetes, összetett bevitelnél) a rejtett mező input eseményéből olvassuk a betűt.
  function onInput(e) {
    const v = e.target.value;
    e.target.value = '';
    if (!v) return;
    const ch = Array.from(v).pop();
    if (HU.has(ch.toUpperCase())) typeLetter(ch);
  }

  const inWord = (r, c) => curWord.cells.some(([a, b]) => a === r && b === c);
  const dirWords = (d) => words.filter((w) => w.dir === d).sort((a, b) => a.num - b.num);

  return (
    <div className="mini-player">
      <div className="mini-player-top">
        <span className="timer">{fmt((solved ? now : now) - start)}</span>
        <button type="button" className="ghost small" onClick={() => checkAll()}>
          Ellenőrzés
        </button>
      </div>
      <div className="mini-cluebar">
        <button type="button" className="mini-cluebar-nav" aria-label="Előző szó" onClick={() => jumpWord(-1)}>
          ‹
        </button>
        <div className="mini-cluebar-text" aria-live="polite">
          <b>
            {curWord.num}
            {curWord.dir === 'A' ? 'V' : 'F'}
          </b>{' '}
          {curWord.clue}
        </div>
        <button type="button" className="mini-cluebar-nav" aria-label="Következő szó" onClick={() => jumpWord(1)}>
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
                  aria-label={`${nums[`${r},${c}`] ? nums[`${r},${c}`] + '. ' : ''}${fill[r][c] || 'üres'}`}
                  className={`mini-sq${inWord(r, c) ? ' word' : ''}${r === cur.r && c === cur.c ? ' active' : ''}${wrong[`${r},${c}`] ? ' wrong' : ''}${solved ? ' solved' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    clickCell(r, c);
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
                    const j = Math.max(0, w.cells.findIndex(([r, c]) => !fill[r][c]));
                    moveTo(w.i, j);
                    focusInput();
                  }}
                >
                  <b>{w.num}</b> {w.clue}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
