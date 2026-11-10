'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import NotificationsButton from './NotificationsButton';
import { ACHIEVEMENTS } from '../lib/achievements';
import { loadProgress } from '../lib/progress';

// A játékok gombsora (a játék logója alatt): balra az Értesítések, Ranglista (a játék fülén nyílik),
// Kisokos (a játék részére visz), Trófeák, jobbra a Főoldal.
export default function GameBar({ game = 'titkos' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const upd = () => setCount((loadProgress().unlocked || []).filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).length);
    upd();
    window.addEventListener('achievements-unlocked', upd);
    window.addEventListener('progress-synced', upd);
    return () => {
      window.removeEventListener('achievements-unlocked', upd);
      window.removeEventListener('progress-synced', upd);
    };
  }, []);
  // Ha a gombsor nem fér ki egy sorban: előbb a trófeaszámláló tűnik el (csak az ikon marad),
  // ha így sem fér ki, a Főoldal gombon is csak a házikó látszik.
  const rowRef = useRef(null);
  const [compact, setCompact] = useState(0);
  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      setCompact(0);
      requestAnimationFrame(() => {
        if (el.scrollWidth <= el.clientWidth + 1) return;
        setCompact(1);
        requestAnimationFrame(() => {
          if (el.scrollWidth <= el.clientWidth + 1) return;
          setCompact(2);
          // nagyon keskeny kijelzőn (pl. 320 px) a gombok is kisebbek
          requestAnimationFrame(() => {
            if (el.scrollWidth > el.clientWidth + 1) setCompact(3);
          });
        });
      });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lbTab = game === 'mini' ? 'mini' : game === 'szo' ? 'szo' : undefined;
  const kisokos = game === 'mini' ? '/kisokos?tab=mini' : game === 'szo' ? '/kisokos?tab=szo' : '/kisokos';
  return (
    <div ref={rowRef} className={`quick-row game-bar${compact >= 1 ? ' compact-trophy' : ''}${compact >= 2 ? ' compact-home' : ''}${compact >= 3 ? ' compact-tight' : ''}`}>
      <NotificationsButton />
      <button className="pill quick-pill" type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-leaderboard', { detail: lbTab ? { tab: lbTab } : {} }))}>
        <Icon src="/icons/Ranglista.png" size={16} className="quick-ico" /> Ranglista
      </button>
      <a className="pill quick-pill" href={kisokos}>
        <Icon src="/icons/Tutorial.png" size={15} className="quick-ico" /> Kisokos
      </a>
      <button className="pill quick-pill" type="button" aria-label={`Trófeák: ${count} / ${ACHIEVEMENTS.length} megszerezve`} title="Trófeák" onClick={() => window.dispatchEvent(new CustomEvent('open-achievements', { detail: { game } }))}>
        <Icon src="/icons/Trofeak.png" size={16} /> <span className="gb-trophy-count">{count}/{ACHIEVEMENTS.length}</span>
      </button>
      <a className="pill quick-pill" href="/" aria-label="Főoldal" title="Főoldal">
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="quick-ico"><path d="M2 7.5 8 2.5l6 5M3.5 6.5V13h3.5V9.5h2V13h3.5V6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="gb-home-label"> Főoldal</span>
      </a>
    </div>
  );
}
