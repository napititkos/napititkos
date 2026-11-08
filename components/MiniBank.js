'use client';
import { useEffect, useState } from 'react';

// Admin: a szóbank és a kérdésbank. Egy sor egy szó: a kézzel írt kérdései (legújabb elöl), a
// megjelent titkosírásokból származó kérdései (ezek csak olvashatók), és az állapota (alap
// szótárban van-e, kizárt-e, hányszor szerepelt rejtvényben). A kézi kérdések szerkeszthetők és
// törölhetők, egy szóhoz tetszőleges számú új változat vihető fel, a kizárás pedig innen is
// feloldható. A keresés a szóban és a kérdések szövegében is keres; a szűrés, rendezés és
// lapozás a szerveren történik.
const FILTERS = [
  ['clues', 'Van kérdése'],
  ['bank', 'Kézi kérdés'],
  ['titkos', 'Titkosírásból'],
  ['noclue', 'Kérdés nélkül'],
  ['excluded', 'Kizárt'],
  ['all', 'Mind'],
];
const SORTS = [
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
  const [sort, setSort] = useState('word');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [edit, setEdit] = useState(null); // { word, id (null = új változat), text }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // A keresés gépelés közben nem kérdez minden betűnél.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Új keresésnél, szűrőnél vagy rendezésnél az első oldalról indulunk.
  useEffect(() => {
    setPage(1);
  }, [debounced, filter, sort]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const qs = new URLSearchParams({ q: debounced, filter, sort, page: String(page) });
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
  }, [debounced, filter, sort, page, refreshKey, reload]);

  // Egy módosítás elküldése; siker után a lista és a fenti összesítők frissülnek.
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

  const st = data?.stats;
  const from = data && data.total ? (data.page - 1) * 50 + 1 : 0;
  const to = data ? Math.min(data.total, data.page * 50) : 0;

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
        placeholder="Írd ide a kérdést…"
        onChange={(e) => setEdit((x) => ({ ...x, text: e.target.value }))}
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
        A kézi kérdések szerkeszthetők és törölhetők, egy szóhoz több változat is felvihető. A bankban végzett módosítás a már várólistán lévő vagy megjelent rejtvényeket nem érinti. A titkosírásból származó
        kérdések csak olvashatók.
      </p>

      <div className="mini-bank-controls">
        <div style={{ flex: 1, minWidth: 180 }}>
          <label className="field-label" htmlFor="mini-bank-q">Keresés a szóban vagy a kérdésben</label>
          <input id="mini-bank-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="pl. alm vagy gyümölcs" style={{ textTransform: 'none', width: '100%' }} />
        </div>
        <div>
          <label className="field-label" htmlFor="mini-bank-sort">Rendezés</label>
          <select id="mini-bank-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
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

      <div className="mini-bank-list" aria-busy={loading}>
        {data && data.rows.length === 0 && !loading && <p className="mini-muted">Nincs a keresésnek megfelelő szó.</p>}
        {(data?.rows || []).map((r) => {
          const adding = edit && edit.word === r.word && !edit.id;
          return (
            <div key={r.word} className={`mini-bank-row${r.excluded ? ' excluded' : ''}`}>
              <div className="mini-bank-word">
                <b>{r.word.toUpperCase()}</b> <span className="mini-len">({r.len})</span>
                <div className="mini-bank-badges">
                  {r.excluded && <span className="mini-src warn">kizárt</span>}
                  {!r.inDict && <span className="mini-src">nincs az alap szótárban</span>}
                  {r.used > 0 && (
                    <span className="mini-src">
                      {r.used}× szerepelt{r.lastWeek ? `, utoljára ${r.lastWeek}` : ''}
                    </span>
                  )}
                </div>
                {r.excluded && (
                  <button type="button" className="ghost small" style={{ marginTop: 6 }} disabled={busy} onClick={() => act({ action: 'unexclude', word: r.word }, `A(z) „${r.word.toUpperCase()}” kizárása feloldva, a generátor újra használhatja.`)}>
                    Kizárás feloldása
                  </button>
                )}
              </div>
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
