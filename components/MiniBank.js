'use client';
import { useEffect, useState } from 'react';

// Admin: a szóbank és a kérdésbank áttekintése (csak olvasás). Egy sor egy szó: a kézzel írt
// kérdései (legújabb elöl), a megjelent titkosírásokból származó kérdései, és az állapota
// (alap szótárban van-e, kizárt-e, hányszor szerepelt rejtvényben). A keresés a szóban és a
// kérdések szövegében is keres; a szűrés, rendezés és lapozás a szerveren történik.
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

export default function MiniBank({ refreshKey = 0 }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('clues');
  const [sort, setSort] = useState('word');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

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
  }, [debounced, filter, sort, page, refreshKey]);

  const st = data?.stats;
  const from = data && data.total ? (data.page - 1) * 50 + 1 : 0;
  const to = data ? Math.min(data.total, data.page * 50) : 0;

  return (
    <div className="card">
      <b>Szóbank és kérdésbank</b>
      {st && (
        <p className="mini-muted" style={{ marginTop: 6 }}>
          Összesen <b>{st.words}</b> szó: <b>{st.withClues}</b> kérdéssel (<b>{st.bankWords}</b> szóhoz <b>{st.bankClues}</b> kézi kérdés, <b>{st.titkosWords}</b> szóhoz titkosírásból), <b>{st.noClue}</b> kérdés
          nélkül · Alap szótár: <b>{st.dictWords}</b> szó · Kizárt: <b>{st.excluded}</b>
        </p>
      )}

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

      {error && (
        <div className="feedback hint" style={{ marginLeft: 0, marginTop: 12 }} role="alert">
          Nem sikerült betölteni a listát. Próbáld újra később.
        </div>
      )}

      <div className="mini-bank-list" aria-busy={loading}>
        {data && data.rows.length === 0 && !loading && <p className="mini-muted">Nincs a keresésnek megfelelő szó.</p>}
        {(data?.rows || []).map((r) => (
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
            </div>
            <div className="mini-bank-clues">
              {r.clues.length === 0 ? (
                <span className="mini-muted">Nincs kérdés (csak az alap szótárban szerepel).</span>
              ) : (
                <ul>
                  {r.clues.map((c, i) => (
                    <li key={i}>
                      <span>{c.clue}</span>
                      <span className="mini-bank-meta">
                        {c.src === 'titkosírás' ? 'titkosírásból' : `kézi${c.at ? `, ${day(c.at)}` : ''}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
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
