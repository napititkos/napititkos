'use client';
import { fmtDHM, fmtHMS, msUntilMidnight, msUntilMonday } from '../lib/budapestClock';
import { useEffect, useRef, useState } from 'react';
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
  // Visszaszámláló a nullázódásig (titkosírás: éjfél, óra:perc:mp; mini: hétfő 0:00, nap/óra/perc).
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Fülváltáskor a doboz megtartja a méretét, amíg az új adat be nem töltődik, utána igazodik hozzá.
  const cardRef = useRef(null);
  const [holdH, setHoldH] = useState(null);
  function load(t) {
    if (cardRef.current) setHoldH(cardRef.current.getBoundingClientRect().height);
    setEntries(null);
    fetch(t === 'mini' ? '/api/mini/leaderboard' : t === 'szo' ? '/api/szo/leaderboard' : t === 'sudoku' ? '/api/sudoku/leaderboard' : '/api/leaderboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setHoldH(null));
  }

  useEffect(() => {
    function handleOpen(e) {
      setMyName(session?.user?.name || getIdentity().name);
      const t = ['mini', 'szo', 'sudoku'].includes(e?.detail?.tab) ? e.detail.tab : 'daily';
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
    <div className="modal-overlay lb-overlay" onClick={() => setOpen(false)}>
      <div className="modal-card has-close-tl" ref={cardRef} style={holdH ? { minHeight: holdH, boxSizing: 'border-box' } : undefined} onClick={(e) => e.stopPropagation()}>
        {/* Bal felső sarokban bezárás (mobilon és asztali gépen is); a többi bezárási mód is megmarad. */}
        <button type="button" className="modal-close-tl" aria-label="Bezárás" onClick={() => setOpen(false)}>
          ×
        </button>
        <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em' }}>
          <Icon src="/icons/Ranglista.png" size={24} /> {tab === 'mini' ? 'Heti ranglista' : 'Mai ranglista'}
        </h2>
        <p className="lb-countdown" aria-live="off">
          {`Nullázódik: ${tab === 'mini' ? fmtDHM(msUntilMonday(new Date(tick))) : fmtHMS(msUntilMidnight(new Date(tick)))} múlva`}
        </p>
        {(miniLive || tab !== 'daily') && (
          <div className="lb-tabs" role="tablist" aria-label="Ranglista választása">
            {[
              ['daily', 'Titkosírás'],
              ['szo', 'Szókereső'],
              ['sudoku', 'Sudoku'],
              ['mini', 'Heti Mini'],
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
          <p style={{ color: 'var(--ink-soft)' }}>{tab === 'mini' ? 'Ezen a héten még senki nem fejtette meg - légy te az első!' : tab === 'szo' ? 'Ma még senki nem talált szót - légy te az első!' : tab === 'sudoku' ? 'Ma még senki nem oldotta meg - légy te az első!' : 'Ma még senki nem fejtette meg - légy te az első!'}</p>
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
                  {tab === 'mini' || tab === 'sudoku' ? formatTime(e.elapsed) : tab === 'szo' ? `${e.points} pont · ${formatTime(e.elapsed)}` : `${e.hintsUsed} tipp · ${formatTime(e.elapsed)}`}
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
