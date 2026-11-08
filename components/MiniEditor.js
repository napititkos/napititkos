'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MiniPlayer from './MiniPlayer';
import { HU, N, gridWarnings, numbering } from '../lib/miniGrid';
import { assemble } from '../lib/miniDraft';

// Mini keresztrejtvény szerkesztő (admin). Egy tábla elmenthető akkor is, ha még nincs kész:
// a mentés piszkozatot készít, amit bármelyik admin megnyithat és folytathat. A tábla kézzel is
// elkészíthető (betűk beírása, fekete négyzetek), a generátor csak egy lehetséges kiindulás.
// Egyszerre két admin szerkesztésénél a mentésszám (rev) véd: ha közben valaki mentett, a
// második mentés nem írja felül, hanem választást kínál.
const DIR = { A: 'Vízszintes', D: 'Függőleges' };
const POLL_MS = 15000;

const blank = () => Array.from({ length: N }, () => Array(N).fill(''));

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
const drafts = (body) => post('/api/admin/mini/drafts', body);
const mini = (body) => post('/api/admin/mini', body);

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('hu-HU', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function MiniEditor({ initial, onClose, onChanged }) {
  const [meta, setMeta] = useState({ id: initial.id || null, rev: initial.rev ?? null, updatedAt: initial.updatedAt || null, updatedBy: initial.updatedBy || null });
  const [title, setTitle] = useState(initial.title || '');
  const [rows, setRows] = useState(initial.rows || blank());
  const [clues, setClues] = useState(initial.clues || {});
  const [dirty, setDirty] = useState(!!initial.dirty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [dir, setDir] = useState('A');
  const [info, setInfo] = useState(initial.info || {}); // szó -> { known, clues: [{ clue, src }] }
  const [alts, setAlts] = useState({}); // szóazonosító -> az utoljára választott alternatíva
  const [trying, setTrying] = useState(null);
  const cellRefs = useRef([]);
  const asked = useRef(new Set(Object.keys(initial.info || {})));
  const prefilled = useRef(new Set(initial.prefilled || []));
  const latest = useRef({});

  const slots = useMemo(() => assemble(rows, clues), [rows, clues]);
  const nums = useMemo(() => numbering(rows), [rows]);
  const warnings = useMemo(() => gridWarnings(rows), [rows]);
  const touch = () => setDirty(true);

  // ---------- szavak, ellenőrzések ----------
  const wordCount = {};
  for (const s of slots) if (s.complete) wordCount[s.word] = (wordCount[s.word] || 0) + 1;
  const duplicates = Object.keys(wordCount).filter((w) => wordCount[w] > 1);
  const issues = [];
  if (!slots.length) issues.push('A tábla üres.');
  const incomplete = slots.filter((s) => !s.complete).length;
  if (incomplete) issues.push(`${incomplete} szó még nincs kitöltve.`);
  const noClue = slots.filter((s) => s.complete && !s.clue).length;
  if (noClue) issues.push(`${noClue} szóhoz még nincs kérdés.`);
  const stale = slots.filter((s) => s.stale).length;
  if (stale) issues.push(`${stale} kérdés elavult (a szó megváltozott).`);
  if (duplicates.length) issues.push(`Ismétlődő szó: ${duplicates.map((w) => w.toUpperCase()).join(', ')}.`);
  const ready = issues.length === 0;
  const allFilled = slots.length > 0 && incomplete === 0;
  const hasLetters = rows.some((r) => r.some((ch) => ch && ch !== '#'));
  const hasContent = hasLetters || Object.keys(clues).length > 0;

  // ---------- rács szerkesztése ----------
  const focusCell = useCallback((r, c) => {
    setSel({ r, c });
    cellRefs.current[r * N + c]?.focus({ preventScroll: true });
  }, []);

  function put(r, c, ch) {
    setRows((prev) => prev.map((row, i) => (i === r ? row.map((v, j) => (j === c ? ch : v)) : row)));
    touch();
  }

  function step(r, c, delta) {
    const dr = dir === 'D' ? delta : 0;
    const dc = dir === 'A' ? delta : 0;
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && cc >= 0 && rr < N && cc < N && rows[rr][cc] === '#') {
      rr += dr;
      cc += dc;
    }
    return rr >= 0 && cc >= 0 && rr < N && cc < N ? [rr, cc] : null;
  }

  function typeChar(r, c, ch) {
    const low = ch.toLowerCase();
    if (low === '#' || low === '.') {
      put(r, c, rows[r][c] === '#' ? '' : '#');
      return;
    }
    if (!HU.has(low)) return;
    put(r, c, low);
    const next = step(r, c, 1);
    if (next) focusCell(next[0], next[1]);
  }

  function backspace(r, c) {
    if (rows[r][c]) {
      put(r, c, '');
      return;
    }
    const prev = step(r, c, -1);
    if (prev) {
      if (rows[prev[0]][prev[1]] && rows[prev[0]][prev[1]] !== '#') put(prev[0], prev[1], '');
      focusCell(prev[0], prev[1]);
    }
  }

  function onKeyDown(e, r, c) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const move = (dr, dc) => {
      e.preventDefault();
      const rr = Math.min(N - 1, Math.max(0, r + dr));
      const cc = Math.min(N - 1, Math.max(0, c + dc));
      if (dr) setDir('D');
      if (dc) setDir('A');
      focusCell(rr, cc);
    };
    if (k === 'ArrowLeft') move(0, -1);
    else if (k === 'ArrowRight') move(0, 1);
    else if (k === 'ArrowUp') move(-1, 0);
    else if (k === 'ArrowDown') move(1, 0);
    else if (k === 'Backspace' || k === 'Delete') {
      e.preventDefault();
      if (rows[r][c] === '#') put(r, c, '');
      else backspace(r, c);
    } else if (k === ' ') {
      e.preventDefault();
      setDir((d) => (d === 'A' ? 'D' : 'A'));
    } else if (k.length === 1 && (HU.has(k.toLowerCase()) || k === '#' || k === '.')) {
      e.preventDefault();
      typeChar(r, c, k);
    }
  }

  // Mobilon (és összetett bevitelnél) a beviteli mező változásából olvassuk a betűt.
  function onChange(e, r, c) {
    const v = Array.from(e.target.value).pop() || '';
    if (!v) put(r, c, '');
    else typeChar(r, c, v);
  }

  const activeCells = useMemo(() => {
    const set = new Set();
    for (const s of slots) {
      if (s.dir !== dir) continue;
      const inside = dir === 'A' ? s.row === sel.r && sel.c >= s.col && sel.c < s.col + s.len : s.col === sel.c && sel.r >= s.row && sel.r < s.row + s.len;
      if (!inside) continue;
      for (let k = 0; k < s.len; k++) set.add(dir === 'A' ? `${s.row},${s.col + k}` : `${s.row + k},${s.col}`);
    }
    return set;
  }, [slots, sel, dir]);

  // ---------- kérdések ----------
  function setClue(s, text) {
    setClues((c) => ({ ...c, [s.key]: { clue: text, word: s.word } }));
    touch();
  }
  function cycleAlt(s) {
    const list = info[s.word]?.clues || [];
    if (list.length < 2) return;
    const i = ((alts[s.key] ?? list.findIndex((x) => x.clue === s.clue)) + 1) % list.length;
    setAlts((a) => ({ ...a, [s.key]: i }));
    setClue(s, list[i].clue);
  }

  // Javaslatok (a bankból és a titkosírásokból) és szótár-ellenőrzés a kész szavakhoz.
  useEffect(() => {
    const need = [...new Set(slots.filter((s) => s.complete).map((s) => s.word))].filter((w) => !asked.current.has(w));
    if (!need.length) return;
    const t = setTimeout(async () => {
      for (let i = 0; i < need.length; i += 20) {
        const chunk = need.slice(i, i + 20);
        chunk.forEach((w) => asked.current.add(w));
        const { ok, data } = await drafts({ action: 'check', words: chunk });
        if (ok) setInfo((prev) => ({ ...prev, ...data.words }));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slots]);

  // Üres kérdés esetén az első javaslat kitöltődik (szavanként csak egyszer, hogy a kérdés
  // szándékos törlését ne írja vissza).
  useEffect(() => {
    const add = {};
    for (const s of slots) {
      const mark = `${s.key}|${s.word}`;
      if (s.complete && !s.clue && info[s.word]?.clues?.length && !prefilled.current.has(mark)) {
        prefilled.current.add(mark);
        add[s.key] = { clue: info[s.word].clues[0].clue, word: s.word };
      }
    }
    if (Object.keys(add).length) {
      setClues((c) => ({ ...c, ...add }));
      touch();
    }
  }, [info, slots]);

  // ---------- mentés, betöltés, ütközés ----------
  latest.current = { meta, dirty, busy, conflict };

  // Egy szerveren tárolt változat betöltése (a helyi tartalom helyére).
  const adopt = useCallback((d) => {
    setMeta({ id: d.id, rev: d.rev, updatedAt: d.updatedAt, updatedBy: d.updatedBy });
    setTitle(d.title || '');
    setRows(d.rows);
    setClues(d.clues || {});
    setDirty(false);
    setConflict(null);
  }, []);

  async function save({ asCopy = false, overwriteRev = null } = {}) {
    setBusy(true);
    setMsg(null);
    const keys = new Set(slots.map((s) => s.key));
    const kept = Object.fromEntries(Object.entries(clues).filter(([k]) => keys.has(k)));
    const payload = { action: 'save', title: (asCopy ? `${title.trim() || 'Névtelen tábla'} (másolat)` : title.trim()) || 'Névtelen tábla', rows, clues: kept };
    if (meta.id && !asCopy) {
      payload.id = meta.id;
      payload.rev = overwriteRev ?? meta.rev;
    }
    const { ok, status, data } = await drafts(payload);
    setBusy(false);
    if (ok) {
      setMeta({ id: data.draft.id, rev: data.draft.rev, updatedAt: data.draft.updatedAt, updatedBy: data.draft.updatedBy });
      setTitle(data.draft.title);
      setDirty(false);
      setConflict(null);
      setMsg({ ok: true, text: 'Mentve.' });
      onChanged?.();
      return data.draft;
    }
    if (status === 409) {
      setConflict(data.draft);
    } else if (status === 404) {
      // Közben törölték: a következő mentés új piszkozatot hoz létre.
      setMeta({ id: null, rev: null, updatedAt: null, updatedBy: null });
      setMsg({ ok: false, text: 'Ezt a piszkozatot közben törölte valaki. A „Mentés" új piszkozatként menti a tartalmát.' });
    } else {
      setMsg({ ok: false, text: data.message || 'Nem sikerült menteni.' });
    }
    return null;
  }

  // Más admin módosításainak észlelése: ha nincs saját módosításunk, csendben frissítünk,
  // különben ütközésként jelezzük.
  useEffect(() => {
    if (!meta.id) return undefined;
    const t = setInterval(async () => {
      const cur = latest.current;
      if (cur.busy || !cur.meta.id) return;
      let res;
      try {
        res = await fetch(`/api/admin/mini/drafts?id=${encodeURIComponent(cur.meta.id)}`, { cache: 'no-store' });
      } catch {
        return;
      }
      if (res.status === 404) {
        setMsg({ ok: false, text: 'Ezt a piszkozatot közben törölte valaki. A „Mentés" új piszkozatként menti a tartalmát.' });
        setMeta({ id: null, rev: null, updatedAt: null, updatedBy: null });
        setDirty(true);
        return;
      }
      if (!res.ok) return;
      const { draft } = await res.json();
      if (draft.rev <= cur.meta.rev || cur.conflict?.rev === draft.rev) return;
      if (!cur.dirty) {
        adopt(draft);
        setMsg({ ok: true, text: `Frissítve: ${draft.updatedBy?.name || 'valaki'} módosította (${when(draft.updatedAt)}).` });
      } else {
        setMsg(null);
        setConflict(draft);
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [meta.id, adopt]);

  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  function close() {
    if (dirty && !confirm('Vannak nem mentett változtatások. Biztosan bezárod?')) return;
    onClose?.();
  }

  async function publish() {
    if (!ready || busy) return;
    if (!confirm('Beemeled a várólistára? A piszkozat megszűnik, a várólistán már csak kipróbálni és törölni lehet.')) return;
    let { id, rev } = meta;
    if (dirty || !id) {
      const d = await save();
      if (!d) return;
      ({ id, rev } = d);
    }
    setBusy(true);
    const { ok, status, data } = await drafts({ action: 'publish', id, rev });
    setBusy(false);
    if (ok) {
      onChanged?.();
      onClose?.('published');
      return;
    }
    if (status === 409) setConflict(data.draft);
    else setMsg({ ok: false, text: data.message || 'Nem sikerült beemelni.' });
  }

  // ---------- generálás, minta, törlések ----------
  const confirmReplace = () => !hasContent || confirm('Ez felülírja a tábla jelenlegi tartalmát. Folytatod?');

  async function generate() {
    if (!confirmReplace()) return;
    setBusy(true);
    setMsg(null);
    const { ok, data } = await mini({ action: 'generate' });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: data.message || 'Nem sikerült generálni.' });
    const nextClues = {};
    const nextInfo = {};
    for (const e of data.puzzle.entries) {
      const key = `${e.dir}:${e.row}:${e.col}`;
      nextInfo[e.word] = { known: true, clues: e.clues };
      asked.current.add(e.word);
      if (e.clues[0]?.clue) {
        nextClues[key] = { clue: e.clues[0].clue, word: e.word };
        prefilled.current.add(`${key}|${e.word}`);
      }
    }
    setRows(data.puzzle.rows.map((r) => r.map((ch) => (ch === '#' ? '#' : ch.toLowerCase()))));
    setClues(nextClues);
    setInfo((prev) => ({ ...prev, ...nextInfo }));
    touch();
  }

  // A beírt betűk és a fekete négyzetek maradnak, a generátor csak az üres négyzeteket tölti ki.
  async function complete() {
    setBusy(true);
    setMsg(null);
    const { ok, data } = await mini({ action: 'complete', rows });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: data.message || 'Nem sikerült kitölteni.' });
    // A beírt szavak kérdése megmarad; ha egy szó helyére más került, annak régi kérdése kiesik,
    // hogy az új szó javaslata töltődjön be.
    const next = { ...clues };
    for (const e of data.puzzle.entries) {
      const key = `${e.dir}:${e.row}:${e.col}`;
      if (next[key]?.word && next[key].word !== e.word) delete next[key];
    }
    setRows(data.puzzle.rows.map((r) => r.map((ch) => (ch === '#' ? '#' : ch.toLowerCase()))));
    setClues(next);
    touch();
    setMsg({ ok: true, text: 'A hiányzó betűk kitöltve. A beírt szavak és a fekete négyzetek nem változtak.' });
  }

  async function randomTemplate() {
    if (!confirmReplace()) return;
    setBusy(true);
    const { ok, data } = await drafts({ action: 'template' });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: 'Nem sikerült mintát választani.' });
    setRows(data.rows);
    setClues({});
    touch();
    focusCell(0, 0);
  }

  function clearLetters() {
    if (!confirm('Törlöd az összes betűt? A fekete négyzetek maradnak.')) return;
    setRows((prev) => prev.map((r) => r.map((ch) => (ch === '#' ? '#' : ''))));
    touch();
  }

  async function deleteWord(word) {
    if (!confirm(`Biztosan törlöd a(z) „${word.toUpperCase()}” szót a kérdésbankból? A kérdései törlődnek, és a generátor többé nem használja.`)) return;
    const { ok } = await mini({ action: 'deleteWord', word });
    setMsg(ok ? { ok: true, text: `A(z) „${word.toUpperCase()}” törölve a bankból.` } : { ok: false, text: 'Nem sikerült törölni.' });
    if (ok) setInfo((prev) => ({ ...prev, [word]: { known: prev[word]?.known ?? true, clues: [] } }));
  }

  function tryIt() {
    if (!allFilled) return;
    setTrying({
      rows,
      entries: slots.map((s) => ({ dir: s.dir, row: s.row, col: s.col, len: s.len, word: s.word, clue: s.clue || '(még nincs kérdés)' })),
    });
  }

  // Új tábla indításakor a kért kiindulás (generálás vagy minta) egyszer lefut.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (initial.autoGenerate) generate();
    else if (initial.autoTemplate) randomTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- megjelenítés ----------
  const sortedSlots = (d) => slots.filter((s) => s.dir === d).sort((a, b) => (nums[`${a.row},${a.col}`] || 0) - (nums[`${b.row},${b.col}`] || 0));
  const selBlack = rows[sel.r][sel.c] === '#';

  return (
    <div className="card mini-editor">
      <div className="mini-editor-head">
        <b>{meta.id ? 'Piszkozat szerkesztése' : 'Új tábla'}</b>
        <span className={`mini-save-state${dirty ? ' dirty' : ''}`} role="status">
          {dirty ? 'Nem mentett változtatások' : meta.id ? `Mentve${meta.updatedBy ? ` – ${meta.updatedBy.name}, ${when(meta.updatedAt)}` : ''}` : 'Még nincs elmentve'}
        </span>
      </div>

      <label className="field-label" htmlFor="mini-title">Tábla neve (csak az adminoknak)</label>
      <input
        id="mini-title"
        value={title}
        maxLength={60}
        placeholder="pl. Őszi tábla 1."
        style={{ textTransform: 'none' }}
        onChange={(e) => {
          setTitle(e.target.value);
          touch();
        }}
      />

      {conflict && (
        <div className="feedback hint mini-conflict" style={{ marginLeft: 0, marginTop: 12 }} role="alert">
          <b>{conflict.updatedBy?.name || 'Valaki'}</b> közben módosította ezt a piszkozatot ({when(conflict.updatedAt)}). Mit tegyünk?
          <div className="mini-clue-actions">
            <button type="button" className="ghost small" onClick={() => adopt(conflict)}>
              Betöltöm az ő változatát
            </button>
            <button type="button" className="ghost small" disabled={busy} onClick={() => save({ asCopy: true })}>
              Az enyémet másolatként mentem
            </button>
            <button type="button" className="ghost small danger" disabled={busy} onClick={() => save({ overwriteRev: conflict.rev })}>
              Felülírom az övét
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 12 }} role="status">
          {msg.text}
        </div>
      )}

      <div className="mini-edit-wrap">
        <div className="mini-edit-grid" role="grid" aria-label="Szerkesztett rács">
          {rows.map((row, r) =>
            row.map((ch, c) => {
              const black = ch === '#';
              const n = nums[`${r},${c}`];
              const isSel = sel.r === r && sel.c === c;
              return (
                <div key={`${r}-${c}`} className={`mini-edit-cell${black ? ' black' : ''}${isSel ? ' sel' : ''}${!black && activeCells.has(`${r},${c}`) ? ' word' : ''}`}>
                  {n && <span className="mini-edit-num">{n}</span>}
                  <input
                    ref={(el) => (cellRefs.current[r * N + c] = el)}
                    value={black ? '' : ch.toUpperCase()}
                    aria-label={`${r + 1}. sor, ${c + 1}. oszlop: ${black ? 'fekete négyzet' : ch ? ch.toUpperCase() : 'üres'}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    onFocus={() => setSel({ r, c })}
                    onKeyDown={(e) => onKeyDown(e, r, c)}
                    onChange={(e) => onChange(e, r, c)}
                  />
                </div>
              );
            })
          )}
        </div>
        <div className="mini-edit-tools">
          <p className="mini-muted">
            Kattints egy négyzetre, és írd be a betűket (a nyilak mozgatnak, a szóköz irányt vált). Fekete négyzet: <kbd>#</kbd> billentyű vagy a gomb.
          </p>
          <button type="button" className="ghost small" onClick={() => put(sel.r, sel.c, selBlack ? '' : '#')}>
            {selBlack ? 'Fehér négyzet' : 'Fekete négyzet'}
          </button>
          <button type="button" className="ghost small" onClick={() => setDir((d) => (d === 'A' ? 'D' : 'A'))} aria-label="Írásirány váltása">
            Írásirány: {dir === 'A' ? '→ vízszintes' : '↓ függőleges'}
          </button>
          <button type="button" className="ghost small" disabled={busy} onClick={randomTemplate}>
            Véletlen minta
          </button>
          <button
            type="button"
            className="ghost small"
            disabled={busy || !hasLetters || allFilled}
            title={!hasLetters ? 'Előbb írj be néhány betűt' : allFilled ? 'Nincs üres négyzet' : 'A beírt betűk és a fekete négyzetek maradnak'}
            onClick={complete}
          >
            {busy ? 'Dolgozom…' : 'Maradék kitöltése'}
          </button>
          <button type="button" className="ghost small" disabled={busy} onClick={generate}>
            Új tábla generálása
          </button>
          <button type="button" className="ghost small danger" onClick={clearLetters}>
            Betűk törlése
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="mini-warnings" aria-label="Figyelmeztetések a rácsról">
          {warnings.map((w) => (
            <li key={w.code}>⚠ {w.text}</li>
          ))}
        </ul>
      )}

      {['A', 'D'].map((d) => (
        <div key={d} className="mini-clues">
          <h3>{DIR[d]}</h3>
          {sortedSlots(d).length === 0 && <p className="mini-muted">Nincs ilyen irányú szó.</p>}
          {sortedSlots(d).map((s) => {
            const list = info[s.word]?.clues || [];
            const inCurrent = list.findIndex((x) => x.clue === s.clue);
            const isActive = activeCells.has(`${s.row},${s.col}`) && s.dir === dir;
            return (
              <div key={s.key} className={`mini-clue-row${isActive ? ' active' : ''}`}>
                <label className="field-label" htmlFor={`mini-clue-${s.key}`}>
                  <b>{nums[`${s.row},${s.col}`]}.</b> {s.letters.map((ch) => (ch ? ch.toUpperCase() : '_')).join('')} <span className="mini-len">({s.len})</span>
                  {s.complete && info[s.word]?.known === false && <span className="mini-src warn">nincs a szótárban</span>}
                  {s.complete && inCurrent >= 0 && list[inCurrent].src === 'titkosírás' && <span className="mini-src">titkosírásból</span>}
                  {s.stale && <span className="mini-src warn">elavult kérdés</span>}
                  {s.complete && wordCount[s.word] > 1 && <span className="mini-src warn">ismétlődik</span>}
                </label>
                {s.complete ? (
                  <>
                    <textarea
                      id={`mini-clue-${s.key}`}
                      value={s.clue}
                      rows={2}
                      maxLength={300}
                      placeholder="Írd ide a kérdést…"
                      onChange={(e) => setClue(s, e.target.value)}
                    />
                    {s.clue.length >= 3 && s.word.length >= 3 && s.clue.toLowerCase().includes(s.word) && (
                      <p className="mini-note">⚠ A kérdés tartalmazza a megfejtést.</p>
                    )}
                    <div className="mini-clue-actions">
                      <button type="button" className="ghost small" disabled={list.length < 2} onClick={() => cycleAlt(s)}>
                        Alternatív kérdés{list.length > 1 ? ` (${(inCurrent >= 0 ? inCurrent : alts[s.key] ?? 0) + 1}/${list.length})` : ''}
                      </button>
                      {s.stale && (
                        <button type="button" className="ghost small" onClick={() => setClue(s, s.clue)}>
                          A kérdés jó ehhez a szóhoz
                        </button>
                      )}
                      <button type="button" className="ghost small danger" onClick={() => deleteWord(s.word)}>
                        Szó törlése a bankból
                      </button>
                      <span className="mini-count">{s.clue.length}/300</span>
                    </div>
                  </>
                ) : (
                  <p className="mini-muted">Töltsd ki a szó összes négyzetét, hogy kérdést írhass hozzá.</p>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="mini-editor-actions">
        <button className="primary" onClick={() => save()} disabled={busy}>
          {busy ? 'Mentés…' : meta.id ? 'Mentés' : 'Mentés piszkozatként'}
        </button>
        <button className="ghost" onClick={tryIt} disabled={!allFilled} title={allFilled ? '' : 'Előbb töltsd ki az összes négyzetet'}>
          Kipróbálom
        </button>
        <button className="primary" onClick={publish} disabled={!ready || busy}>
          Beemelés a várólistára
        </button>
        <button className="ghost" onClick={close}>
          Bezárás
        </button>
      </div>
      {!ready && <p className="mini-muted" style={{ marginTop: 8 }}>A beemelés előtt: {issues.slice(0, 3).join(' ')}</p>}

      {trying && (
        <div className="modal-overlay mini-try-overlay" onClick={() => setTrying(null)}>
          <div className="modal-card" role="dialog" aria-label="Mini keresztrejtvény kipróbálása" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b>Kipróbálás</b>
              <button className="ghost small" onClick={() => setTrying(null)}>
                Bezárás
              </button>
            </div>
            <MiniPlayer rows={trying.rows} entries={trying.entries} />
          </div>
        </div>
      )}
    </div>
  );
}
