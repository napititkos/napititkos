'use client';
import { useEffect, useState } from 'react';
import SzoGame from './SzoGame';
import Pager from './Pager';

// Admin: napi szókereső.
// - A mai rács: előnézet, „Kipróbálom” (pontosan úgy, ahogy a játékosok látják, de semmi nem
//   mentődik), és a mai szavak, mindegyik mellett tiltás gombbal (a szó a tiltott szavak közé
//   kerül, és a mai rácsból is azonnal kikerül).
// - Szóbank: keresés (ékezet nélkül is; * és ? mintával), szűrés (összes / kötelező / bónusz /
//   hozzáadott / tiltott), hossz és kezdőbetű szerint, rendezés (ABC / hossz), lapozás; a szavak
//   mellett Hozzáadás / Tiltás / Visszaállítás.
// - A játékosok „Problémád van?” jelzései.
const STATUS_CLASS = { tiltott: 'warn', trágár: 'warn' };
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
function dayLabel(d) {
  try {
    return new Date(`${d}T12:00:00Z`).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });
  } catch {
    return d;
  }
}

export default function AdminSzo() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [len, setLen] = useState(0);
  const [letter, setLetter] = useState('');
  const [sort, setSort] = useState('abc');
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState(null);
  const [trying, setTrying] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [openDay, setOpenDay] = useState(null); // a lenyitott tervezett nap // a kipróbált nap rácsa
  const [regen, setRegen] = useState(null); // épp cserélt nap

  function load() {
    const sp = new URLSearchParams({ q, filter, len: String(len), letter, sort, page: String(page) });
    fetch(`/api/admin/szo?${sp}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }
  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, len, letter, sort, page]);
  // Szűrőváltáskor az első oldalra ugrunk.
  useEffect(() => setPage(1), [q, filter, len, letter, sort]);

  async function act(action, word) {
    const r = await fetch('/api/admin/szo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, word }) });
    const d = await r.json().catch(() => ({}));
    const txt = { add: 'hozzáadva a kötelező szavakhoz (a következő naptól)', ban: 'tiltva', unban: 'tiltása feloldva (a következő naptól)' }[action];
    setMsg(r.ok ? { ok: true, text: `„${d.word.toUpperCase()}” ${txt}.` } : { ok: false, text: d.message || 'Nem sikerült.' });
    load();
  }
  async function regenerate(date) {
    if (!confirm(`Lecseréled a(z) ${date} napi rácsot egy újra?`)) return;
    setRegen(date);
    const r = await fetch('/api/admin/szo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'regenerate', date }) });
    const d = await r.json().catch(() => ({}));
    setRegen(null);
    setMsg(r.ok ? { ok: true, text: `${date}: új rács, a napi szó: ${d.word.toUpperCase()}.` } : { ok: false, text: d.message || 'Nem sikerült.' });
    load();
  }
  async function dismiss(id) {
    await fetch('/api/admin/szo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismissReport', id }) });
    load();
  }

  if (!data) return <div className="card">Betöltés…</div>;
  const t = data.today;
  return (
    <>
      {msg && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginBottom: 10 }} role="status">
          {msg.text}
        </div>
      )}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b>A mai rács</b>
          {t && (
            <button className="primary small" onClick={() => setTrying(t)}>
              Kipróbálom
            </button>
          )}
        </div>
        {t ? (
          <>
            <div className="admin-szo-today">
              <div className="admin-szo-grid" aria-label="A mai rács">
                {t.grid.map((ch, i) => (
                  <span key={i}>{ch.toUpperCase()}</span>
                ))}
              </div>
              <div className="mini-muted">
                Napi szó: <b>{t.word.toUpperCase()}</b> · {t.required.length} kötelező, {t.bonus.length} bónuszszó
              </div>
            </div>
            {[
              ['Kötelező szavak', t.required],
              ['Bónuszszavak', t.bonus],
            ].map(([title, words]) => (
              <div key={title} className="admin-szo-today-words">
                <h3>{title} ({words.length})</h3>
                <ul>
                  {words.map((w) => (
                    <li key={w}>
                      {w.toUpperCase()}
                      {w !== t.word && (
                        <button type="button" className="admin-szo-x" aria-label={`${w.toUpperCase()} tiltása`} title="Tiltás" onClick={() => act('ban', w)}>
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          <p className="mini-muted">Nem sikerült rácsot generálni.</p>
        )}
      </div>

      <div className="card">
        <b>A következő 7 nap</b>
        <p className="mini-muted" style={{ margin: '4px 0 8px' }}>A tervezett rácsok; a játékosok mindig csak az adott napon kapják meg. A „Szavak” gombbal megnézheted a nap szavait, és a × gombbal bármelyiket tilthatod (a mai és az összes tervezett napból kikerül). Az „Új kérése” lecseréli a nap rácsát egy új napi szóval.</p>
        <ul className="admin-szo-upcoming">
          {(data.upcoming || []).map((u) => (
            <li key={u.date}>
              <div className="admin-szo-grid small" aria-hidden="true">
                {u.grid.map((ch, i) => (
                  <span key={i}>{ch.toUpperCase()}</span>
                ))}
              </div>
              <div className="admin-szo-up-meta">
                <b>{dayLabel(u.date)}</b>
                <span>
                  Napi szó: <b>{u.word.toUpperCase()}</b> · {u.required.length} kötelező, {u.bonus.length} bónusz
                </span>
              </div>
              <span className="admin-szo-actions">
                <button className="ghost small" aria-expanded={openDay === u.date} onClick={() => setOpenDay(openDay === u.date ? null : u.date)}>
                  {openDay === u.date ? 'Szavak ▴' : 'Szavak ▾'}
                </button>
                <button className="ghost small" onClick={() => setTrying(u)}>
                  Kipróbálom
                </button>
                <button className="ghost small" disabled={regen === u.date} onClick={() => regenerate(u.date)}>
                  {regen === u.date ? 'Generálás…' : 'Új kérése'}
                </button>
              </span>
              {/* A nap szavai, a mai rácshoz hasonlóan: × = tiltás (az összes tervezett napból kikerül). */}
              {openDay === u.date && (
                <div className="admin-szo-up-words">
                  {[
                    ['Kötelező szavak', u.required],
                    ['Bónuszszavak', u.bonus],
                  ].map(([title, words]) => (
                    <div key={title} className="admin-szo-today-words">
                      <h3>
                        {title} ({words.length})
                      </h3>
                      <ul>
                        {words.map((w) => (
                          <li key={w}>
                            {w.toUpperCase()}
                            {w !== u.word && (
                              <button type="button" className="admin-szo-x" aria-label={`${w.toUpperCase()} tiltása`} title="Tiltás" onClick={() => act('ban', w)}>
                                ×
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <b>Szóbank</b>
        <p className="mini-muted" style={{ margin: '4px 0 8px' }}>
          Kötelező (köznév): {data.counts.required} · bónusz: {data.counts.bonus} · hozzáadott: {data.counts.added} · tiltott: {data.counts.banned}
        </p>
        {/* Új szó kézi felvitele a kötelező szavak közé. */}
        <form
          className="admin-szo-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (newWord.trim()) act('add', newWord.trim()).then(() => setNewWord(''));
          }}
        >
          <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Új szó (3-9 betű)" aria-label="Új szó felvitele" maxLength={9} />
          <button type="submit" className="primary small" disabled={!newWord.trim()}>
            Felvitel a bankba
          </button>
        </form>
        <input type="search" className="admin-szo-search" placeholder="Keresés (3-9 betű; * és ? minta)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Szó keresése" />
        <div className="admin-szo-filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Szűrés">
            <option value="all">Összes</option>
            <option value="required">Kötelező</option>
            <option value="bonus">Bónusz</option>
            <option value="added">Hozzáadott</option>
            <option value="banned">Tiltott</option>
          </select>
          <select value={len} onChange={(e) => setLen(Number(e.target.value))} aria-label="Hossz">
            <option value={0}>Bármilyen hossz</option>
            {[3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n} betűs
              </option>
            ))}
          </select>
          <select value={letter} onChange={(e) => setLetter(e.target.value)} aria-label="Kezdőbetű">
            <option value="">Bármely kezdőbetű</option>
            {LETTERS.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Rendezés">
            <option value="abc">ABC-sorrend</option>
            <option value="len">Hossz szerint</option>
          </select>
        </div>
        <p className="mini-muted" style={{ margin: '8px 0' }}>
          {data.total} találat · {data.page}. oldal / {data.pages}
        </p>
        <ul className="admin-szo-list">
          {data.results.map((r) => (
            <li key={r.word}>
              <b>{r.word.toUpperCase()}</b> <span className={`mini-src ${STATUS_CLASS[r.status] || ''}`}>{r.status}</span>
              <span className="admin-szo-actions">
                {r.status === 'tiltott' ? (
                  <button className="ghost small" onClick={() => act('unban', r.word)}>
                    Visszaállítás
                  </button>
                ) : (
                  <>
                    {!['kötelező', 'hozzáadott'].includes(r.status) && (
                      <button className="ghost small" onClick={() => act('add', r.word)}>
                        Hozzáadás
                      </button>
                    )}
                    <button className="ghost small danger" onClick={() => act('ban', r.word)}>
                      Tiltás
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        <Pager page={data.page} pages={data.pages} onPage={setPage} />
      </div>

      <div className="card">
        <b>Játékosok jelzései ({data.reports.length})</b>
        {data.reports.length === 0 && <p className="mini-muted">Nincs új jelzés.</p>}
        <ul className="admin-szo-list">
          {data.reports.map((r) => {
            const w = r.text.trim().toLowerCase();
            const single = /^[a-záéíóöőúüű]{3,9}$/.test(w);
            return (
              <li key={r.id}>
                <span>
                  <span className="mini-src">{{ missing: 'nem fogadja el', wrong: 'hibás/sértő', other: 'egyéb' }[r.type]}</span> {r.text}
                  <span className="mini-muted">
                    {' '}
                    · {r.date || ''}
                    {r.name ? ` · ${r.name}` : ''}
                  </span>
                </span>
                <span className="admin-szo-actions">
                  {single && r.type === 'missing' && (
                    <button className="ghost small" onClick={() => act('add', w)}>
                      Hozzáadás
                    </button>
                  )}
                  {single && r.type === 'wrong' && (
                    <button className="ghost small danger" onClick={() => act('ban', w)}>
                      Tiltás
                    </button>
                  )}
                  <button className="ghost small" onClick={() => dismiss(r.id)}>
                    Kész
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {trying && (
        <div className="modal-overlay mini-try-overlay" onClick={() => setTrying(null)}>
          <div className="modal-card" role="dialog" aria-label="Szókereső kipróbálása" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b>Kipróbálás: {trying.date} (semmi nem mentődik)</b>
              <button className="ghost small" onClick={() => setTrying(null)}>
                Bezárás
              </button>
            </div>
            <SzoGame key={trying.date + trying.word} data={{ ...trying, mine: null }} preview />
          </div>
        </div>
      )}
    </>
  );
}
