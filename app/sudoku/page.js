'use client';
import { useEffect, useState } from 'react';
import SudokuGame from '../../components/SudokuGame';
import GameBar from '../../components/GameBar';
import GameFooter from '../../components/GameFooter';
import Icon from '../../components/Icon';
import Logo from '../../components/Logo';
import { deviceId } from '../../lib/device';
import { recordSudoku } from '../../lib/gameProgress';

// A napi sudoku oldala. Megoldás után a statisztika (saját idő, átlagidő, megoldók).
const fmt = (ms) => {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function SudokuPage() {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [intro, setIntro] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('sudoku_intro_seen')) setIntro(true);
    } catch {}
  }, []);
  const dismissIntro = () => {
    setIntro(false);
    try {
      localStorage.setItem('sudoku_intro_seen', '1');
    } catch {}
  };
  useEffect(() => {
    const dev = deviceId();
    fetch(`/api/sudoku${dev ? `?device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.stats) setStats(d.stats);
        if (d.mine) recordSudoku(d.date);
      })
      .catch(() => setData({ live: false }));
  }, []);
  function solved(el, st) {
    recordSudoku(data.date);
    setStats(st || null);
  }
  const mine = stats?.mine ?? data?.mine ?? null;
  return (
    <div className="wrap">
      {intro && (
        <div className="modal-overlay" onClick={dismissIntro}>
          <div className="modal-card intro-card" role="dialog" aria-label="Üdv a Sudokuban!" onClick={(e) => e.stopPropagation()}>
            <div className="intro-logo">
              <Logo size={102} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em', textAlign: 'center' }}>Üdv a Sudokuban!</h2>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              Minden nap új 6×6-os sudokut oldhatsz meg: minden sorba, oszlopba és dobozba az 1–6 számok kerülnek, mindegyik egyszer. Hétfőn a legkönnyebb, vasárnap a legnehezebb. Ha még nem ismered, nézd át a Kisokost!
            </p>
            <div className="intro-actions">
              <button className="ghost" onClick={dismissIntro}>
                Bezárás
              </button>
              <a className="intro-kisokos" href="/kisokos?tab=sudoku" onClick={dismissIntro}>
                <Icon src="/icons/Tutorial.png" size={18} className="icon-on-accent" />
                Kisokos
              </a>
            </div>
          </div>
        </div>
      )}
      <GameBar game="sudoku" />
      <h1 className="sr-only">Sudoku</h1>
      <div className="card">
        {!data ? (
          <p>Betöltés…</p>
        ) : !data.live || !data.givens ? (
          <p>A napi sudoku hamarosan érkezik.</p>
        ) : (
          <>
            <SudokuGame key={data.date} data={data} solvedTime={data.mine} onSolved={solved} />
            {mine != null && (
              <div className="mini-stats stats" style={{ justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <span className="pill">Időd: {fmt(mine)}</span>
                {stats?.avg != null && <span className="pill">Átlagidő: {fmt(stats.avg)}</span>}
                {stats?.count != null && <span className="pill">Megoldások: {stats.count}</span>}
              </div>
            )}
          </>
        )}
      </div>
      {data?.live && <GameFooter game="sudoku" />}
    </div>
  );
}
