'use client';
import { useEffect, useState } from 'react';
import { fold, parseNeedle } from '../lib/miniBank';

// Admin: a szóbank és a kérdésbank. A lista alapból csak a szavakat mutatja (egy sor egy szó,
// rövid jelzésekkel), így gyorsan görgethető és kereshető; egy szóra kattintva lenyílik a
// részletes nézet: a kézzel írt kérdései (legújabb elöl), a megjelent titkosírásokból származó
// kérdései (ezek csak olvashatók), az állapota (alap szótárban van-e, hányszor szerepelt
// rejtvényben), és a műveletek (szerkesztés, törlés, új kérdésváltozat, a kizárás feloldása).
// A keresés a szóban és a kérdések szövegében is keres; a szűrés, rendezés és lapozás a
// szerveren történik.
const FILTERS = [
  ['clues', 'Van kérdése'],
  ['bank', 'Kézi kérdés'],
  ['titkos', 'Titkosírásból'],
  ['noclue', 'Kérdés nélkül'],
  ['excluded', 'Kizárt'],
  ['all', 'Mind'],
];
const LENGTHS = [1, 2, 3, 4, 5];
const SORTS = [
  ['rel', 'Találat szerint'],
  ['word', 'Ábécé'],
  ['len', 'Hossz'],
  ['recent', 'Legutóbb felvitt'],
  ['used', 'Leggyakrabban használt'],
];

function day(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function MiniBank({ refreshKey = 0, onChanged }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('clues');
  const [sortPick, setSortPick] = useState(null); // null = automatikus
  const [len, setLen] = useState(0); // 0 = bármilyen hosszú
  const [letter, setLetter] = useState(''); // '' = bármelyik kezdőbetű
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(() => new Set()); // a lenyitott szavak
  const [edit, setEdit] = useState(null); // { word, id (null = új változat), text }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Keresésnél alapból a találat jósága szerint rendez (pontos egyezés elöl), keresés nélkül ábécé szerint;
  // a legördülő listából bármikor át lehet állítani.
  const sort = sortPick ?? (debounced ? 'rel' : 'word');

  // A keresés gépelés közben nem kérdez minden betűnél.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Új keresésnél, szűrőnél vagy rendezésnél az első oldalról indulunk.
  useEffect(() => {
    setPage(1);
  }, [debounced, filter, sort, len, letter]);

  // Más listanézetnél a lenyitott sorok és a félbehagyott szerkesztés nem marad meg.
  useEffect(() => {
    setOpen(new Set());
    setEdit(null);
  }, [debounced, filter, sort, len, letter, page]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const qs = new URLSearchParams({ q: debounced, filter, sort, page: String(page) });
    if (len) qs.set('len', String(len));
    if (letter) qs.set('letter', letter);
    fetch(`/api/admin/mini/bank?${qs}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(false);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced, filter, sort, len, letter, page, refreshKey, reload]);

  // Egy módosítás elküldése; siker után a lista és a fenti összesítők frissülnek (a lenyitott
  // sorok nyitva maradnak).
  async function act(body, okText) {
    setBusy(true);
    setMsg(null);
    let res;
    let d = {};
    try {
      res = await fetch('/api/admin/mini/bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      d = await res.json().catch(() => ({}));
    } catch {
      res = { ok: false };
    }
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: d.message || 'Nem sikerült. Próbáld újra!' });
      if (res.status === 404) setReload((k) => k + 1);
      return false;
    }
    setMsg({ ok: true, text: okText });
    setEdit(null);
    setReload((k) => k + 1);
    onChanged?.();
    return true;
  }

  const saveEdit = () => {
    const base = { word: edit.word, clue: edit.text };
    return edit.id
      ? act({ action: 'editClue', id: edit.id, ...base }, 'A kérdés átírva.')
      : act({ action: 'addClue', ...base }, `Új kérdésváltozat felvíve a(z) „${edit.word.toUpperCase()}” szóhoz.`);
  };

  function removeClue(word, id) {
    if (!confirm(`Törlöd ezt a kérdésváltozatot a(z) „${word.toUpperCase()}” szóhoz? A már beemelt rejtvényekben lévő kérdés nem változik.`)) return;
    act({ action: 'deleteClue', word, id }, 'A kérdésváltozat törölve.');
  }

  // Lenyitáskor egyből megnyílik az új kérdésváltozat mezője (Enterrel menthető).
  function toggle(word) {
    const opening = !open.has(word);
    if (edit && edit.word === word) setEdit(null); // a bezárt sor szerkesztése megszűnik
    if (opening) setEdit({ word, id: null, text: '' });
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }

  const st = data?.stats;
  const size = data?.pageSize || 50;
  const from = data && data.total ? (data.page - 1) * size + 1 : 0;
  const to = data ? Math.min(data.total, data.page * size) : 0;
  const nd = parseNeedle(debounced);
  // A keresett rész kiemelése a szóban (csak szövegkeresésnél; az ékezetes betűk is megfelelnek).
  const marked = (word) => {
    const w = word.toUpperCase();
    if (nd.kind !== 'text') return w;
    const i = fold(word).indexOf(nd.text);
    if (i < 0 || fold(word).length !== word.length) return w;
    return (
      <>
        {w.slice(0, i)}
        <mark>{w.slice(i, i + nd.text.length)}</mark>
        {w.slice(i + nd.text.length)}
      </>
    );
  };
  // A betűsávban a kiválasztott betű akkor is megmarad (hogy le lehessen venni), ha a másik szűrő mellett nincs szó.
  const letterList = data ? (letter && !data.letters.some(([ch]) => ch === letter) ? [...data.letters, [letter, 0]].sort((a, b) => a[0].localeCompare(b[0], 'hu')) : data.letters) : [];

  const editor = (word, id) => (
    <div className="mini-bank-edit">
      <label className="field-label" htmlFor={`mini-bank-edit-${word}-${id || 'new'}`}>
        {id ? 'Kérdés szerkesztése' : 'Új kérdésváltozat'} – {word.toUpperCase()}
      </label>
      <textarea
        id={`mini-bank-edit-${word}-${id || 'new'}`}
        value={edit.text}
        rows={2}
        maxLength={300}
        autoFocus
        placeholder="Írd ide a kérdést… (Enter: mentés, Shift+Enter: új sor)"
        onChange={(e) => setEdit((x) => ({ ...x, text: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            if (!busy && edit.text.trim()) saveEdit();
          }
          if (e.key === 'Escape') setEdit(null);
        }}
      />
      <div className="mini-clue-actions">
        <button type="button" className="primary small" disabled={busy || !edit.text.trim()} onClick={saveEdit}>
          {busy ? 'Mentés…' : 'Mentés'}
        </button>
        <button type="button" className="ghost small" disabled={busy} onClick={() => setEdit(null)}>
          Mégse
        </button>
        <span className="mini-count">{edit.text.length}/300</span>
      </div>
    </div>
  );

  return (
    <div className="card">
      <b>Szóbank és kérdésbank</b>
      {st && (
        <p className="mini-muted" style={{ marginTop: 6 }}>
          Összesen <b>{st.words}</b> szó: <b>{st.withClues}</b> kérdéssel (<b>{st.bankWords}</b> szóhoz <b>{st.bankClues}</b> kézi kérdés, <b>{st.titkosWords}</b> szóhoz titkosírásból), <b>{st.noClue}</b> kérdés
          nélkül · Alap szótár: <b>{st.dictWords}</b> szó · Kizárt: <b>{st.excluded}</b>
        </p>
      )}
      <p className="mini-muted">
        Kattints egy szóra a kérdései és a műveletek megnyitásához. A kézi kérdések szerkeszthetők és törölhetők, egy szóhoz több változat is felvihető. A bankban végzett módosítás a már várólistán lévő vagy
        megjelent rejtvényeket nem érinti. A titkosírásból származó kérdések csak olvashatók.
      </p>

      <div className="mini-bank-controls">
        <div style={{ flex: 1, minWidth: 180 }}>
          <label className="field-label" htmlFor="mini-bank-q">Keresés a szóban vagy a kérdésben</label>
          <input id="mini-bank-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="pl. alm, gyümölcs vagy a??a" style={{ textTransform: 'none', width: '100%' }} />
          <div className="mini-muted" style={{ fontSize: 12, marginTop: 4 }}>
            Az ékezet nem számít (ko = kő). Minta: <b>?</b> egy betű, <b>*</b> bármennyi betű, a teljes szóra, pl. <b>a??a</b>, <b>k*ő</b>, <b>??</b>.
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="mini-bank-sort">Rendezés</label>
          <select id="mini-bank-sort" value={sort} onChange={(e) => setSortPick(e.target.value)}>
            {SORTS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mini-bank-filters" role="group" aria-label="Szűrés">
        {FILTERS.map(([v, t]) => (
          <button key={v} type="button" className={filter === v ? 'primary small' : 'ghost small'} aria-pressed={filter === v} onClick={() => setFilter(v)}>
            {t}
          </button>
        ))}
      </div>

      <div className="mini-bank-facet" role="group" aria-label="Szűrés hossz szerint">
        <span className="mini-bank-facet-label">Hossz</span>
        <button type="button" className={!len ? 'primary small' : 'ghost small'} aria-pressed={!len} onClick={() => setLen(0)}>
          Mind
        </button>
        {LENGTHS.map((n) => {
          const c = data?.lenCounts?.[n] || 0;
          return (
            <button key={n} type="button" className={len === n ? 'primary small' : 'ghost small'} aria-pressed={len === n} disabled={!data || (c === 0 && len !== n)} onClick={() => setLen(len === n ? 0 : n)}>
              {n} betű{data ? ` (${c})` : ''}
            </button>
          );
        })}
      </div>

      <div className="mini-bank-facet" role="group" aria-label="Ugrás kezdőbetű szerint">
        <span className="mini-bank-facet-label">Kezdőbetű</span>
        <button type="button" className={!letter ? 'primary small' : 'ghost small'} aria-pressed={!letter} onClick={() => setLetter('')}>
          Mind
        </button>
        {letterList.map(([ch, c]) => (
          <button key={ch} type="button" className={`mini-bank-letter ${letter === ch ? 'primary small' : 'ghost small'}`} aria-pressed={letter === ch} title={`${c} szó`} onClick={() => setLetter(letter === ch ? '' : ch)}>
            {ch.toUpperCase()}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 12 }} role="status">
          {msg.text}
        </div>
      )}
      {error && (
        <div className="feedback hint" style={{ marginLeft: 0, marginTop: 12 }} role="alert">
          Nem sikerült betölteni a listát. Próbáld újra később.
        </div>
      )}

      {open.size > 0 && (
        <div style={{ marginTop: 10 }}>
          <button type="button" className="ghost small" onClick={() => { setOpen(new Set()); setEdit(null); }}>
            Mind bezárása ({open.size})
          </button>
        </div>
      )}

      <div className="mini-bank-list" aria-busy={loading}>
        {data && data.rows.length === 0 && !loading && <p className="mini-muted">Nincs a keresésnek megfelelő szó.</p>}
        {(data?.rows || []).map((r) => {
          const isOpen = open.has(r.word);
          const adding = edit && edit.word === r.word && !edit.id;
          const panel = `mini-bank-panel-${r.word}`;
          const titkosCount = r.clues.length - r.ownCount;
          // Keresésnél, ha a találat a kérdés szövegében van (és nem a szóban), a zárt sor alatt
          // látszik a találatot adó kérdés, hogy ne kelljen mindent megnyitni.
          const hit = nd.kind === 'text' && !isOpen && !fold(r.word).includes(nd.text) ? r.clues.find((c) => fold(c.clue).includes(nd.text)) : null;
          return (
            <div key={r.word} className={`mini-bank-item${isOpen ? ' open' : ''}${r.excluded ? ' excluded' : ''}`}>
              <button type="button" className="mini-bank-head" aria-expanded={isOpen} aria-controls={panel} onClick={() => toggle(r.word)}>
                <span className="mini-bank-chev" aria-hidden="true">▸</span>
                <span className="mini-bank-w">
                  <b>{marked(r.word)}</b> <span className="mini-len">({r.len})</span>
                </span>
                <span className="mini-bank-tags">
                  {r.excluded && <span className="mini-src warn">kizárt</span>}
                  <span className="mini-bank-count">{r.clues.length === 0 ? 'nincs kérdés' : `${r.clues.length} kérdés`}</span>
                </span>
              </button>
              {hit && <div className="mini-bank-hit">„{hit.clue}”</div>}
              {isOpen && (
                <div id={panel} className="mini-bank-panel">
                  <div className="mini-bank-badges">
                    {r.excluded && <span className="mini-src warn">kizárt – a generátor nem használja</span>}
                    {!r.inDict && <span className="mini-src">nincs az alap szótárban</span>}
                    {r.used > 0 && (
                      <span className="mini-src">
                        {r.used}× szerepelt{r.lastWeek ? `, utoljára ${r.lastWeek}` : ''}
                      </span>
                    )}
                    {r.clues.length > 0 && (
                      <span className="mini-src">
                        {r.ownCount} kézi{titkosCount > 0 ? `, ${titkosCount} titkosírásból` : ''}
                      </span>
                    )}
                  </div>
                  {r.excluded ? (
                    <button type="button" className="ghost small" style={{ marginBottom: 8 }} disabled={busy} onClick={() => act({ action: 'unexclude', word: r.word }, `A(z) „${r.word.toUpperCase()}” kizárása feloldva, a generátor újra használhatja.`)}>
                      Kizárás feloldása
                    </button>
                  ) : (
                    <button type="button" className="ghost small danger" style={{ marginBottom: 8 }} disabled={busy} onClick={() => act({ action: 'exclude', word: r.word }, `A(z) „${r.word.toUpperCase()}” kizárva: a generátor nem használja (a kérdései megmaradnak).`)}>
                      Kizárás
                    </button>
                  )}
                  <div className="mini-bank-clues">
                    {r.clues.length === 0 && !adding && <span className="mini-muted">Nincs kérdés (csak az alap szótárban szerepel).</span>}
                    {r.clues.length > 0 && (
                      <ul>
                        {r.clues.map((c, i) => {
                          const editing = edit && edit.id && edit.id === c.id;
                          return (
                            <li key={c.id || `t${i}`}>
                              {editing ? (
                                editor(r.word, c.id)
                              ) : (
                                <>
                                  <span>{c.clue}</span>
                                  <span className="mini-bank-meta">
                                    {c.src === 'titkosírás' ? 'titkosírásból (csak olvasható)' : `kézi, ${day(c.at)}${c.editedAt ? `, szerkesztve: ${day(c.editedAt)}` : ''}`}
                                  </span>
                                  {c.id && (
                                    <span className="mini-bank-actions">
                                      <button type="button" className="ghost small" disabled={busy} onClick={() => setEdit({ word: r.word, id: c.id, text: c.clue })}>
                                        Szerkesztés
                                      </button>
                                      <button type="button" className="ghost small danger" disabled={busy} onClick={() => removeClue(r.word, c.id)}>
                                        Törlés
                                      </button>
                                    </span>
                                  )}
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {adding ? (
                      editor(r.word, null)
                    ) : (
                      <button type="button" className="ghost small" style={{ marginTop: 8 }} disabled={busy} onClick={() => setEdit({ word: r.word, id: null, text: '' })}>
                        + Új kérdésváltozat
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data && data.total > 0 && (
        <div className="mini-bank-pager">
          <button type="button" className="ghost small" disabled={data.page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ‹ Előző
          </button>
          <span className="mini-muted">
            {from}–{to} / {data.total} szó · {data.page}/{data.pages}. oldal
          </span>
          <button type="button" className="ghost small" disabled={data.page >= data.pages || loading} onClick={() => setPage((p) => p + 1)}>
            Következő ›
          </button>
        </div>
      )}
    </div>
  );
}
