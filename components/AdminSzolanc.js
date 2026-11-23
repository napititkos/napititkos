'use client';
import { useEffect, useState } from 'react';

// Admin – Szólánc kézi válogatása. Mindig 10 javaslat látszik a soron következő szabad nap
// nehézségéhez, mindegyiknél az összes legrövidebb úttal. A Beemelés a javaslatot erre a napra
// teszi; a Beemelt vagy Elvetett javaslat helyére egy új érkezik (a többi marad). Ahol nincs
// beemelt feladvány, ott a dátumból automatikusan generált érvényes – a válogatás nem kötelező.
const WEEKDAY = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
const day = (d) => `${d.slice(5).replace('-', '.')}. ${WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()]}`;
const up = (w) => String(w || '').toUpperCase();
const key = (s) => `${s.start}>${s.end}`;

async function api(body) {
  const res = await fetch('/api/admin/szolanc', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function AdminSzolanc() {
  const [state, setState] = useState(null);
  // Javaslatok nehézségenként (így a már betöltöttek megmaradnak, ha a következő nap nehézsége változik).
  const [cache, setCache] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => api().then((r) => r.ok && setState(r.data));
  useEffect(() => {
    load();
  }, []);

  // A soron következő nap nehézségéhez mindig 10 javaslat legyen: csak a hiányzókat kérjük le.
  const level = state?.nextLevel;
  const list = (level && cache[level]) || [];
  useEffect(() => {
    if (!level || list.length >= 10) return;
    let cancelled = false;
    api({ action: 'suggest', level, count: 10 - list.length, exclude: list.map(key) }).then((r) => {
      if (cancelled || !r.ok) return;
      setCache((c) => ({ ...c, [level]: [...(c[level] || []), ...(r.data.suggestions || [])].slice(0, 10) }));
    });
    return () => {
      cancelled = true;
    };
  }, [level, list.length]);

  const drop = (lv, s) => setCache((c) => ({ ...c, [lv]: (c[lv] || []).filter((x) => key(x) !== key(s)) }));
  async function pick(s) {
    setBusy(true);
    setMsg(null);
    const r = await api({ action: 'pick', start: s.start, end: s.end });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.data?.message || 'Nem sikerült beemelni.' });
    drop(s.level, s);
    setState(r.data);
    setMsg({ ok: true, text: `Beemelve: ${up(s.start)} → ${up(s.end)} (${r.data.date}).` });
  }
  async function remove(date) {
    setBusy(true);
    const r = await api({ action: 'remove', date });
    setBusy(false);
    if (r.ok) setState(r.data);
    else setMsg({ ok: false, text: r.data?.message || 'Nem sikerült törölni.' });
  }

  if (!state) return <div className="card">Betöltés…</div>;
  return (
    <>
      <div className="card">
        <b>Javaslatok a következő szabad napra</b>
        <p className="mini-muted" style={{ margin: '4px 0 10px', fontSize: 13 }}>
          {state.next ? (
            <>
              Soron következő szabad nap: <b>{day(state.next)}</b> · nehézség: <b>{state.nextLevel}/5</b>. Ha egy napra nem emelsz be semmit, automatikusan kap egy feladványt – a válogatás csak arra való, hogy kézzel is lehessen dönteni.
            </>
          ) : (
            'Nincs szabad nap.'
          )}
        </p>
        {msg && <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginBottom: 10 }}>{msg.text}</div>}
        {list.length === 0 && <p>Javaslatok betöltése…</p>}
        <div className="szl-admin-list">
          {list.map((s) => (
            <div key={key(s)} className="szl-admin-item">
              <div className="szl-admin-head">
                <b>
                  {up(s.start)} → {up(s.end)}
                </b>
                <span className="mini-muted">
                  {s.par} lépés · {s.paths} legrövidebb út
                </span>
              </div>
              <ol className="szl-admin-paths">
                {(s.allPaths || []).map((p, i) => (
                  <li key={i}>{p.map(up).join(' → ')}</li>
                ))}
              </ol>
              <div className="szl-admin-actions">
                <button type="button" className="primary small" disabled={busy} onClick={() => pick(s)}>
                  Beemelés
                </button>
                <button type="button" className="ghost small" disabled={busy} onClick={() => drop(s.level, s)}>
                  Elvetés
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <b>A mai és a következő 20 nap</b>
        <div className="szl-admin-days">
          {state.days.map((d) => (
            <div key={d.date} className={`szl-admin-day${d.picked ? ' picked' : ''}`}>
              <span className="szl-admin-date">
                {day(d.date)}
                {d.date === state.today ? ' (ma)' : ''}
              </span>
              <span className="szl-admin-lvl">{d.level}/5</span>
              <span className="szl-admin-words" title={(d.allPaths || []).map((p) => p.map(up).join(' → ')).join('\n')}>
                {up(d.start)} → {up(d.end)} <span className="mini-muted">({d.par} lépés, {d.paths} út)</span>
              </span>
              <span className="szl-admin-src">{d.picked ? 'beemelve' : 'automatikus'}</span>
              {d.picked && d.date > state.today ? (
                <button type="button" className="ghost small" disabled={busy} onClick={() => remove(d.date)}>
                  Törlés
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
