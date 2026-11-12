'use client';
import SolvedMark from './SolvedMark';
import { useEffect, useState } from 'react';
import MiniPlayer from './MiniPlayer';
import MiniThumb from './MiniThumb';
import { weekLabel } from '../lib/isoWeek';
import { recordMiniWeek } from '../lib/gameProgress';

// Korábbi rejtvények – Minik: a korábbi heti mini keresztrejtvények (a mostani hét előttiek).
// Az előnézet megfejtés előtt üres, utána kitöltött. Rányomva megnyílik és megfejthető.
function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MiniArchive() {
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/mini/archive', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401) setError('A korábbi minik megfejtéséhez jelentkezz be.');
        setItems(d.items || []);
      })
      .catch(() => setItems([]));
  }, []);

  async function solved(it, elapsed) {
    setItems((list) => list.map((x) => (x.id === it.id ? { ...x, solvedMs: elapsed } : x)));
    recordMiniWeek(it.week);
    try {
      await fetch('/api/mini/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week: it.week, elapsed }) });
    } catch {}
  }

  if (error) return <p>{error} <a href="/login?callbackUrl=/archive">Bejelentkezés</a></p>;
  if (!items) return <p>Betöltés…</p>;
  if (!items.length) return <p className="mini-muted">Még nincs korábbi mini keresztrejtvény – az első a következő héten kerül ide.</p>;
  return (
    <div className="mini-list">
      {items.map((it) => {
        const open = openId === it.id;
        return (
          <div key={it.id} className={`card mini-list-item${open ? ' open' : ''}`}>
            <button type="button" className="mini-list-head" aria-expanded={open} onClick={() => setOpenId(open ? null : it.id)}>
              <MiniThumb rows={it.rows} filled={it.solvedMs != null} />
              <span className="mini-list-meta">
                <b>{weekLabel(it.week)}</b>
                <span>{it.solvedMs != null ? `Megfejtve · ${fmt(it.solvedMs)}` : 'Még nem fejtetted meg'}</span>
              </span>
              <span className="mini-list-chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
                                {(it.solvedMs != null) ? <SolvedMark /> : null}
            </button>
            {open && (
              <div className="mini-list-body">
                <MiniPlayer key={it.id} rows={it.rows} entries={it.entries} solvedTime={it.solvedMs} onSolved={(t) => solved(it, t)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
