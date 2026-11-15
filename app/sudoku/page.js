'use client';
import { useEffect, useState } from 'react';
import SudokuGame from '../../components/SudokuGame';
import GameBar from '../../components/GameBar';
import { useFirstVisit } from '../../lib/firstVisit';
import GameFooter from '../../components/GameFooter';
import Icon from '../../components/Icon';
import Logo from '../../components/Logo';
import { deviceId } from '../../lib/device';
import { recordSudoku } from '../../lib/gameProgress';

// A napi sudoku oldala: minden nap egy 6x6-os és egy 9x9-es (azonos nehézséggel). A méret a címben
// is megjelenik (?m=9), így a link, a ranglista és a visszatérés is a választott méretre visz.
// Megoldás után a statisztika (saját idő, átlagidő, megoldók).
const fmt = (ms) => {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function SudokuPage() {
  const [size, setSize] = useState(null);
  const [bySize, setBySize] = useState({});
  const data = size ? bySize[size] || null : null;
  const stats = data?.stats || null;
  // Üdvözlő ablak csak az első alkalommal (az eszközön és a fiókban is megjegyezve).
  const [intro, dismissIntro] = useFirstVisit('sudoku');
  useEffect(() => {
    setSize(new URLSearchParams(window.location.search).get('m') === '9' ? 9 : 6);
  }, []);
  useEffect(() => {
    if (!size || bySize[size]) return;
    const dev = deviceId();
    fetch(`/api/sudoku?size=${size}${dev ? `&device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setBySize((m) => ({ ...m, [size]: d }));
        if (d.mine) recordSudoku(d.date, size);
      })
      .catch(() => setBySize((m) => ({ ...m, [size]: { live: false } })));
  }, [size, bySize]);
  // A 9x9-es (vagy 6x6-os) ranglista Játszom gombja ezen az oldalon a megfelelő méretre vált.
  useEffect(() => {
    const on = (e) => {
      const href = String(e?.detail?.href || '');
      if (href.startsWith('/sudoku')) changeSize(/[?&]m=9/.test(href) ? 9 : 6);
    };
    window.addEventListener('framed-play', on);
    return () => window.removeEventListener('framed-play', on);
  }, []);
  function changeSize(n) {
    setSize(n);
    try {
      const u = new URL(window.location.href);
      if (n === 9) u.searchParams.set('m', '9');
      else u.searchParams.delete('m');
      window.history.replaceState(null, '', u.pathname + u.search);
    } catch {}
  }
  function solved(el, st) {
    recordSudoku(data.date, size);
    setBySize((m) => ({ ...m, [size]: { ...m[size], mine: el, stats: st || m[size]?.stats || null } }));
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
              Minden nap egy új 6×6-os és egy új 9×9-es sudokut oldhatsz meg (a kettő nehézsége azonos): minden sorba, oszlopba és dobozba az 1–6, illetve az 1–9 számok kerülnek, mindegyik egyszer. A kettő között a nehézség melletti 6×6 és 9×9 gombokkal válthatsz. Hétfőn a legkönnyebb, vasárnap a legnehezebb. Ha még nem ismered, nézd át a Kisokost!
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
      <GameBar game="sudoku" lbSize={size || 6} />
      <h1 className="sr-only">Sudoku</h1>
      <div className="card">
        {!data ? (
          <p>Betöltés…</p>
        ) : !data.live || !data.givens ? (
          <p>A napi sudoku hamarosan érkezik.</p>
        ) : (
          <>
            <SudokuGame key={`${size}-${data.date}`} data={data} solvedTime={data.mine} onSolved={solved} onSize={changeSize} />
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
