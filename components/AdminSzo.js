'use client';
import { useEffect, useState } from 'react';

// Admin: napi szókereső – a mai rács előnézete, a szólista keresése, szó hozzáadása, egy
// kattintással tiltás (átkerül a tiltott listába) és a tiltás feloldása.
const STATUS_CLASS = { tiltott: 'warn', trágár: 'warn' };

export default function AdminSzo() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);
  function load(query = q) {
    fetch(`/api/admin/szo${query ? `?q=${encodeURIComponent(query)}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }
  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  async function act(action, word) {
    const r = await fetch('/api/admin/szo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, word }) });
    const d = await r.json().catch(() => ({}));
    const txt = { add: 'hozzáadva a kötelező szavakhoz', ban: 'tiltva', unban: 'tiltása feloldva' }[action];
    setMsg(r.ok ? { ok: true, text: `„${d.word.toUpperCase()}” ${txt}. A következő napoktól érvényes.` } : { ok: false, text: d.message || 'Nem sikerült.' });
    load(q);
  }
  async function dismiss(id) {
    await fetch('/api/admin/szo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismissReport', id }) });
    load(q);
  }
  if (!data) return <div className="card">Betöltés…</div>;
  const t = data.today;
  return (
    <>
      <div className="card">
        <b>A mai rács</b>
        {t ? (
          <div className="admin-szo-today">
            <div className="admin-szo-grid" aria-label="A mai rács">
              {t.grid.map((ch, i) => (
                <span key={i}>{ch.toUpperCase()}</span>
              ))}
            </div>
            <div className="mini-muted">
              Napi szó: <b>{t.word.toUpperCase()}</b> · {t.required.length} kötelező, {t.bonus.length} bónuszszó
              <br />
              {t.required.map((w) => w.toUpperCase()).join(', ')}
            </div>
          </div>
        ) : (
          <p className="mini-muted">Nem sikerült rácsot generálni.</p>
        )}
        <p className="mini-muted" style={{ marginBottom: 0 }}>
          Kötelező (köznév): {data.counts.required} · bónusz: {data.counts.bonus} · hozzáadott: {data.counts.added} · tiltott: {data.counts.banned}
        </p>
      </div>
      <div className="card">
        <b>Szólista</b>
        <input type="search" className="admin-szo-search" placeholder="Keresés vagy új szó (3-9 betű)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Szó keresése" />
        {msg && <p className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0 }} role="status">{msg.text}</p>}
        <ul className="admin-szo-list">
          {data.results.map((r) => (
            <li key={r.word}>
              <b>{r.word.toUpperCase()}</b> <span className={`mini-src ${STATUS_CLASS[r.status] || ''}`}>{r.status}</span>
              <span className="admin-szo-actions">
                {r.status === 'tiltott' ? (
                  <button className="ghost small" onClick={() => act('unban', r.word)}>Tiltás feloldása</button>
                ) : (
                  <>
                    {!['kötelező', 'hozzáadott'].includes(r.status) && (
                      <button className="ghost small" onClick={() => act('add', r.word)}>Hozzáadás</button>
                    )}
                    <button className="ghost small danger" onClick={() => act('ban', r.word)}>Tiltás</button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
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
                  <span className="mini-muted"> · {r.date || ''}{r.name ? ` · ${r.name}` : ''}</span>
                </span>
                <span className="admin-szo-actions">
                  {single && r.type === 'missing' && <button className="ghost small" onClick={() => act('add', w)}>Hozzáadás</button>}
                  {single && r.type === 'wrong' && <button className="ghost small danger" onClick={() => act('ban', w)}>Tiltás</button>}
                  <button className="ghost small" onClick={() => dismiss(r.id)}>Kész</button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="card">
        <b>Tiltott szavak ({data.banned.length})</b>
        <ul className="admin-szo-list">
          {data.banned.map((w) => (
            <li key={w}>
              <b>{w.toUpperCase()}</b>
              <span className="admin-szo-actions">
                <button className="ghost small" onClick={() => act('unban', w)}>Visszaállítás</button>
              </span>
            </li>
          ))}
        </ul>
        {data.added.length > 0 && (
          <>
            <b>Hozzáadott szavak ({data.added.length})</b>
            <p className="mini-muted">{data.added.map((w) => w.toUpperCase()).join(', ')}</p>
          </>
        )}
      </div>
    </>
  );
}
