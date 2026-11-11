'use client';
import { useEffect, useState } from 'react';
import SudokuGame from './SudokuGame';

// Admin: a mai és a következő 7 nap sudokuja (nehézség, megadott számok), kipróbálás és a jövőbeli
// napok cseréje („Új kérése”, ugyanazzal a nehézséggel).
function dayLabel(d) {
  try {
    return new Date(`${d}T12:00:00Z`).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });
  } catch {
    return d;
  }
}

export default function AdminSudoku() {
  const [data, setData] = useState(null);
  const [trying, setTrying] = useState(null);
  const [regen, setRegen] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = () =>
    fetch('/api/admin/sudoku', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  async function regenerate(date) {
    if (!confirm(`Lecseréled a(z) ${date} napi sudokut egy újra?`)) return;
    setRegen(date);
    const r = await fetch('/api/admin/sudoku', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'regenerate', date }) });
    const d = await r.json().catch(() => ({}));
    setRegen(null);
    setMsg(r.ok ? { ok: true, text: `${date}: új rejtvény (${d.clues} megadott szám).` } : { ok: false, text: d.message || 'Nem sikerült.' });
    load();
  }
  if (!data) return <div className="card">Betöltés…</div>;
  return (
    <>
      {msg && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginBottom: 10 }} role="status">
          {msg.text}
        </div>
      )}
      <div className="card">
        <b>A mai és a következő 7 nap</b>
        <p className="mini-muted" style={{ margin: '4px 0 8px' }}>
          A nehézség a hét napjától függ (hétfő, kedd 1/5 · szerda, csütörtök 2/5 · péntek 3/5 · szombat 4/5 · vasárnap 5/5). A játékosok mindig csak az adott napon kapják meg a rejtvényt; a maiat már nem lehet cserélni.
        </p>
        <ul className="admin-szo-upcoming">
          {data.days.map((u, i) => (
            <li key={u.date}>
              <span className="sudoku-thumb" aria-hidden="true">
                {u.givens.map((n, k) => (
                  <span key={k}>{n || ''}</span>
                ))}
              </span>
              <div className="admin-szo-up-meta">
                <b>
                  {i === 0 ? 'Ma – ' : ''}
                  {dayLabel(u.date)}
                </b>
                <span>
                  #{u.number} · nehézség: <b>{u.level}/5</b> · {u.clues} megadott szám
                </span>
              </div>
              <span className="admin-szo-actions">
                <button className="ghost small" onClick={() => setTrying(u)}>
                  Kipróbálom
                </button>
                {i > 0 && (
                  <button className="ghost small" disabled={regen === u.date} onClick={() => regenerate(u.date)}>
                    {regen === u.date ? 'Generálás…' : 'Új kérése'}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {trying && (
        <div className="modal-overlay mini-try-overlay" onClick={() => setTrying(null)}>
          <div className="modal-card" role="dialog" aria-label="Sudoku kipróbálása" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b>Kipróbálás: {trying.date} (semmi nem mentődik)</b>
              <button className="ghost small" onClick={() => setTrying(null)}>
                Bezárás
              </button>
            </div>
            <SudokuGame key={trying.date} data={trying} preview />
          </div>
        </div>
      )}
    </>
  );
}
