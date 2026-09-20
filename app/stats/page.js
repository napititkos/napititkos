'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress } from '../../lib/progress';
import { ACHIEVEMENTS } from '../../lib/achievements';

import { enumerationFor } from '../../lib/format';

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
  const [mySubmissions, setMySubmissions] = useState(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/account/my-submissions')
      .then((r) => r.json())
      .then((d) => setMySubmissions(d.submissions || []))
      .catch(() => setMySubmissions([]));
  }, [session]);

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

      {session?.user && (
        <div className="card">
          <b>Elfogadott beküldéseim {mySubmissions ? `(${mySubmissions.length})` : ''}</b>
          {mySubmissions === null && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Betöltés…</p>}
          {mySubmissions && mySubmissions.length === 0 && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
              Még egy beküldésed sem került be a napi titkosírások közé.{' '}
              <a href="/submit" style={{ color: 'var(--accent)' }}>
                Küldj be egyet!
              </a>
            </p>
          )}
          {mySubmissions && mySubmissions.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {mySubmissions.map((s) => (
                <div className="sub-item" key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>
                      {s.clue} {enumerationFor(s.answer)}
                    </span>
                    <span style={{ fontSize: 12.5, color: s.shownDate ? 'var(--good)' : 'var(--ink-soft)' }}>
                      {s.shownDate ? `✓ ${s.shownDate}-án szerepelt` : 'még beütemezve'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
