'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress } from '../../lib/progress';
import { ACHIEVEMENTS } from '../../lib/achievements';

function formatTime(ms) {
  if (ms == null) return '–';
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function StatsPage() {
  const { data: session } = useSession();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress) {
    return (
      <div className="wrap">
        <h1 className="page-title">Statisztikáim</h1>
        <div className="card">Betöltés…</div>
      </div>
    );
  }

  const unlockedCount = (progress.unlocked || []).length;

  return (
    <div className="wrap">
      <h1 className="page-title">Statisztikáim</h1>
      <div className="card">
        {!session?.user && (
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 0 }}>
            Ez most csak ezen az eszközön/böngészőn mért adat.{' '}
            <a href="/login" style={{ color: 'var(--accent)' }}>
              Jelentkezz be
            </a>
            , hogy a fiókodhoz kötve, más eszközök között is szinkronban maradjon.
          </p>
        )}
        <div className="stats" style={{ justifyContent: 'flex-start', gap: 28 }}>
          <div className="stat">
            <b>{progress.streak}</b>
            <span>napos sorozat</span>
          </div>
          <div className="stat">
            <b>{progress.best}</b>
            <span>legjobb sorozat</span>
          </div>
          <div className="stat">
            <b>{progress.totalSolved || 0}</b>
            <span>megoldott rejtvény</span>
          </div>
          <div className="stat">
            <b>{progress.noHintSolves || 0}</b>
            <span>tipp nélkül megoldva</span>
          </div>
          <div className="stat">
            <b>{formatTime(progress.fastestTime)}</b>
            <span>leggyorsabb idő</span>
          </div>
          <div className="stat">
            <b>{unlockedCount}/{ACHIEVEMENTS.length}</b>
            <span>trófea</span>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="ghost" onClick={() => window.dispatchEvent(new Event('open-achievements'))}>
            Trófeák megtekintése
          </button>
          <a href="/archive">
            <button className="ghost">Korábbi titkosírások</button>
          </a>
        </div>
      </div>
    </div>
  );
}
