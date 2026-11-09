'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import MiniPlayer from '../../components/MiniPlayer';
import DailyReactions from '../../components/DailyReactions';
import Icon from '../../components/Icon';
import { deviceId } from '../../lib/device';
import { getIdentity } from '../../lib/identity';
import { fireConfetti } from '../../components/Confetti';

// A heti mini keresztrejtvény (csak élesítés után). Időzítő, ellenőrzés, megfejtéskor konfetti,
// statisztika (a te időd, átlagidő, teljesítések), emoji-reakciók és idő szerinti ranglista;
// minden hetente indul újra. A megfejtés ténye és ideje ezen az eszközön megmarad a hét végéig.
const KEY = 'titkositas_mini_v1';
function fmt(ms) {
  if (ms == null) return '–';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export default function MiniPage() {
  const { status } = useSession();
  const [data, setData] = useState(null);
  const [local, setLocal] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    const dev = deviceId();
    fetch(`/api/mini${dev ? `?device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setStats(d.stats || null);
        const l = loadLocal();
        setLocal(l && l.week === d.week ? l : null);
      })
      .catch(() => setData({ live: false }));
  }, [status]);

  async function solved(elapsed) {
    fireConfetti();
    const rec = { week: data.week, elapsed };
    try {
      localStorage.setItem(KEY, JSON.stringify(rec));
    } catch {}
    setLocal(rec);
    try {
      const res = await fetch('/api/mini/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: data.week, elapsed, device: deviceId(), name: getIdentity().name }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.stats) setStats(d.stats);
    } catch {}
  }

  if (!data) return <div className="wrap"><div className="card">Betöltés…</div></div>;
  if (!data.live || !data.puzzle) {
    return (
      <div className="wrap">
        <h1 className="page-title">Mini keresztrejtvény</h1>
        <div className="card">
          <p>{data.live ? 'Ezen a héten még nincs új mini keresztrejtvény. Nézz vissza később!' : 'A mini keresztrejtvény hamarosan érkezik.'}</p>
          <a href="/">← Vissza a főoldalra</a>
        </div>
      </div>
    );
  }

  const done = !!local;
  const myTime = stats?.mine ?? local?.elapsed ?? null;
  return (
    <div className="wrap mini-page">
      <div className="page-title-row">
        <h1 className="page-title">Heti mini keresztrejtvény</h1>
        <a href="/" className="back-home-btn"><svg className="back-arrow" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7.5 3.5 3 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> Főoldal</a>
      </div>
      <div className="card">
        <MiniPlayer key={data.puzzle.id + (done ? '-kesz' : '')} rows={data.puzzle.rows} entries={data.puzzle.entries} onSolved={solved} solvedTime={done ? local.elapsed : null} />
        {done && (
          <>
            <div className="mini-stats" aria-label="Statisztika">
              <span className="pill">Időd: {fmt(myTime)}</span>
              <span className="pill">Átlagidő: {fmt(stats?.avg)}</span>
              <span className="pill">Teljesítések: {stats?.count ?? '–'}</span>
            </div>
            <DailyReactions date={data.week} scope="mini" interactive />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <button className="ghost small" onClick={() => window.dispatchEvent(new CustomEvent('open-leaderboard', { detail: { tab: 'mini' } }))}>
                <Icon src="/icons/Ranglista.png" size={16} /> Heti ranglista
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
