'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getIdentity } from '../lib/identity';
import Icon from './Icon';

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function LeaderboardModal() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(null);
  const [myName, setMyName] = useState('');
  // Két ranglista (a mini élesítése után): Titkosírás (mai) és Keresztrejtvény (heti, idő szerint).
  const [tab, setTab] = useState('daily');
  const [miniLive, setMiniLive] = useState(false);

  function load(t) {
    setEntries(null);
    fetch(t === 'mini' ? '/api/mini/leaderboard' : '/api/leaderboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]));
  }

  useEffect(() => {
    function handleOpen(e) {
      setMyName(session?.user?.name || getIdentity().name);
      const t = e?.detail?.tab === 'mini' ? 'mini' : 'daily';
      setTab(t);
      load(t);
      fetch('/api/mini/status')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setMiniLive(!!d?.live))
        .catch(() => {});
      setOpen(true);
    }
    window.addEventListener('open-leaderboard', handleOpen);
    return () => window.removeEventListener('open-leaderboard', handleOpen);
  }, [session]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em' }}>
          <Icon src="/icons/Ranglista.png" size={24} /> {tab === 'mini' ? 'Heti ranglista' : 'Mai ranglista'}
        </h2>
        {(miniLive || tab === 'mini') && (
          <div className="lb-tabs" role="tablist" aria-label="Ranglista választása">
            {[
              ['daily', 'Titkosírás'],
              ['mini', 'Keresztrejtvény'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={tab === v}
                className={tab === v ? 'primary small' : 'ghost small'}
                onClick={() => {
                  if (tab === v) return;
                  setTab(v);
                  load(v);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {entries === null && <p>Betöltés...</p>}
        {entries && entries.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>{tab === 'mini' ? 'Ezen a héten még senki nem fejtette meg - légy te az első!' : 'Ma még senki nem fejtette meg - légy te az első!'}</p>
        )}
        {entries && entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map((e, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 10px',
                  borderRadius: 10,
                  background: e.name === myName ? 'var(--accent-soft)' : 'transparent',
                  fontWeight: e.name === myName ? 700 : 500,
                }}
              >
                <span>
                  {i + 1}. {e.name}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  {tab === 'mini' ? formatTime(e.elapsed) : `${e.hintsUsed} tipp · ${formatTime(e.elapsed)}`}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="primary" onClick={() => setOpen(false)}>
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}
