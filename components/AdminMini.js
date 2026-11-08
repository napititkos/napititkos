'use client';
import { useEffect, useMemo, useState } from 'react';

// Admin: mini keresztrejtvény (5x5). Új rács generálása előnézettel, a szavakhoz kérdések
// (a bankban már meglévő kérdés automatikusan kitöltve, az alternatívák között lapozni lehet),
// szó törlése a bankból (többé nem generálódik), beemelés a várólistára (csak ha minden kérdés
// ki van töltve), új szó felvitele kérdéssel, és a várólista. Hetente, vasárnap éjfélkor (hétfő
// 00:00) a várólista első eleme jelenik meg.
const DIR = { A: 'Vízszintes', D: 'Függőleges' };

// Hagyományos számozás: minden négyzet, ahol vízszintes vagy függőleges szó kezdődik, sorszámot kap.
function numbering(rows) {
  const n = rows.length;
  const black = (r, c) => r < 0 || c < 0 || r >= n || c >= n || rows[r][c] === '#';
  const nums = {};
  let k = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (black(r, c)) continue;
      if (black(r, c - 1) || black(r - 1, c)) nums[`${r},${c}`] = ++k;
    }
  return nums;
}

function MiniGrid({ rows, small = false }) {
  const nums = numbering(rows);
  return (
    <div className={`mini-grid${small ? ' small' : ''}`} role="img" aria-label="Rejtvényrács">
      {rows.map((row, r) =>
        row.map((ch, c) =>
          ch === '#' ? (
            <span key={`${r}-${c}`} className="mini-cell black" />
          ) : (
            <span key={`${r}-${c}`} className="mini-cell">
              {nums[`${r},${c}`] && <span className="mini-num">{nums[`${r},${c}`]}</span>}
              <span className="mini-ch">{ch.toUpperCase()}</span>
            </span>
          )
        )
      )}
    </div>
  );
}

async function api(body) {
  const res = await fetch('/api/admin/mini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function AdminMini() {
  const [state, setState] = useState(null);
  const [puzzle, setPuzzle] = useState(null); // { rows, entries: [{ ..., clues, clue, alt }] }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [newWord, setNewWord] = useState({ word: '', clue: '' });

  async function load() {
    const res = await fetch('/api/admin/mini', { cache: 'no-store' });
    if (res.ok) setState(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    setMsg(null);
    const { ok, data } = await api({ action: 'generate' });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: data.message || 'Nem sikerült generálni.' });
    setPuzzle({
      ...data.puzzle,
      entries: data.puzzle.entries.map((e) => ({ ...e, alt: 0, clue: e.clues[0]?.clue || '' })),
    });
  }

  const nums = useMemo(() => (puzzle ? numbering(puzzle.rows) : {}), [puzzle]);
  const allFilled = !!puzzle && puzzle.entries.every((e) => e.clue.trim());
  const setEntry = (i, patch) => setPuzzle((p) => ({ ...p, entries: p.entries.map((e, k) => (k === i ? { ...e, ...patch } : e)) }));

  async function publish() {
    if (!allFilled) return;
    setBusy(true);
    const { ok, data } = await api({ action: 'publish', rows: puzzle.rows, entries: puzzle.entries.map(({ dir, row, col, word, clue }) => ({ dir, row, col, word, clue })) });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: data.message || 'Nem sikerült beemelni.' });
    setMsg({ ok: true, text: 'Beemelve a várólistára. Az új vagy átírt kérdések bekerültek a bankba.' });
    setPuzzle(null);
    load();
  }

  async function deleteWord(word) {
    if (!confirm(`Biztosan törlöd a(z) „${word.toUpperCase()}” szót a bankból? A kérdései törlődnek, és a generátor többé nem használja.`)) return;
    const { ok } = await api({ action: 'deleteWord', word });
    setMsg(ok ? { ok: true, text: `A(z) „${word.toUpperCase()}” törölve. Generálj új rácsot, hogy kikerüljön ebből is.` } : { ok: false, text: 'Nem sikerült törölni.' });
    load();
  }

  async function addWord() {
    const { ok, data } = await api({ action: 'addWord', word: newWord.word, clue: newWord.clue });
    if (!ok) return setMsg({ ok: false, text: data.message || 'Nem sikerült felvinni.' });
    setMsg({ ok: true, text: `A(z) „${data.word.toUpperCase()}” bekerült a bankba (${data.variants} kérdésváltozat).` });
    setNewWord({ word: '', clue: '' });
    load();
  }

  async function removeQueued(id) {
    if (!confirm('Biztosan törlöd ezt a rejtvényt a várólistáról?')) return;
    await api({ action: 'removeQueued', id });
    load();
  }

  return (
    <>
      <div className="card">
        <b>Áttekintés</b>
        {!state ? (
          <p style={{ color: 'var(--ink-soft)' }}>Betöltés…</p>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 0 }}>
            Várólista: <b>{state.queue.length}</b> rejtvény · Bank: <b>{state.bankWords}</b> szó kézi kérdéssel, <b>{state.titkosWords}</b> szó
            titkosírásból · Kizárt szavak: <b>{state.excluded}</b>
            <br />
            {state.start ? (
              <>
                Új rejtvény hetente, vasárnap éjfélkor (hétfő 00:00) kerül ki a várólista elejéről, a(z) {state.start} kezdetű héttől.{' '}
                {state.current ? `Az aktuális a ${state.current.week} kezdetű hété.` : 'Még nem jelent meg rejtvény.'}
              </>
            ) : (
              <>A megjelenés még nincs elindítva: a várólista egyelőre csak gyűlik, rejtvény nem kerül ki.</>
            )}
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b>Új rejtvény</b>
          <button className="primary" onClick={generate} disabled={busy}>
            {busy ? 'Generálás…' : puzzle ? 'Generálj újat' : 'Rejtvény generálása'}
          </button>
        </div>
        {msg && (
          <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 12 }} role="status">
            {msg.text}
          </div>
        )}
        {puzzle && (
          <>
            <div className="mini-preview">
              <MiniGrid rows={puzzle.rows} />
            </div>
            {['A', 'D'].map((d) => (
              <div key={d} className="mini-clues">
                <h3>{DIR[d]}</h3>
                {puzzle.entries.map((e, i) =>
                  e.dir !== d ? null : (
                    <div key={i} className="mini-clue-row">
                      <label className="field-label" htmlFor={`mini-clue-${i}`}>
                        <b>{nums[`${e.row},${e.col}`]}.</b> {e.word.toUpperCase()} <span className="mini-len">({e.len})</span>
                        {e.clues[e.alt]?.src === 'titkosírás' && e.clue === e.clues[e.alt]?.clue && <span className="mini-src">titkosírásból</span>}
                      </label>
                      <textarea id={`mini-clue-${i}`} value={e.clue} rows={2} onChange={(ev) => setEntry(i, { clue: ev.target.value })} placeholder="Írd ide a kérdést…" />
                      <div className="mini-clue-actions">
                        <button
                          type="button"
                          className="ghost small"
                          disabled={e.clues.length < 2}
                          title={e.clues.length < 2 ? 'Nincs másik kérdés ehhez a szóhoz' : `${e.alt + 1}/${e.clues.length}`}
                          onClick={() => {
                            const alt = (e.alt + 1) % e.clues.length;
                            setEntry(i, { alt, clue: e.clues[alt].clue });
                          }}
                        >
                          Alternatív kérdés{e.clues.length > 1 ? ` (${e.alt + 1}/${e.clues.length})` : ''}
                        </button>
                        <button type="button" className="ghost small danger" onClick={() => deleteWord(e.word)}>
                          Szó törlése a bankból
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="primary" onClick={publish} disabled={!allFilled || busy}>
                Beemelés a várólistára
              </button>
              {!allFilled && <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>A beemeléshez minden szóhoz írj kérdést.</span>}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <b>Új szó felvitele</b>
        <div className="mini-add">
          <div>
            <label className="field-label" htmlFor="mini-new-word">Szó (1-5 betű)</label>
            <input id="mini-new-word" value={newWord.word} maxLength={5} onChange={(e) => setNewWord((w) => ({ ...w, word: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="mini-new-clue">Kérdés</label>
            <input id="mini-new-clue" value={newWord.clue} style={{ textTransform: 'none' }} onChange={(e) => setNewWord((w) => ({ ...w, clue: e.target.value }))} />
          </div>
          <button className="primary" onClick={addWord} disabled={!newWord.word.trim() || !newWord.clue.trim()}>
            Felvitel
          </button>
        </div>
      </div>

      <div className="card">
        <b>Várólista ({state?.queue.length || 0})</b>
        {state && state.queue.length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Még üres a várólista.</p>}
        <div className="mini-queue">
          {(state?.queue || []).map((q, i) => (
            <div key={q.id} className="mini-queue-item">
              <MiniGrid rows={q.rows} small />
              <div className="mini-queue-info">
                <b>{i + 1}.</b> {q.entries.map((e) => e.word.toUpperCase()).join(', ')}
                <button className="ghost small danger" onClick={() => removeQueued(q.id)}>
                  Törlés
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
