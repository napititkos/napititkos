'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import NotificationsButton from './NotificationsButton';
import { ACHIEVEMENTS } from '../lib/achievements';
import { loadProgress } from '../lib/progress';

// A játékok gombsora (a játék logója alatt): Főoldal, Értesítések, Ranglista (a játék fülén
// nyílik), Kisokos (a játék részére visz), Trófeák (a játék szűrőjével nyílik).
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
  const lbTab = game === 'mini' ? 'mini' : game === 'szo' ? 'szo' : undefined;
  const kisokos = game === 'mini' ? '/kisokos?tab=mini' : game === 'szo' ? '/kisokos?tab=szo' : '/kisokos';
  return (
    <div className="quick-row">
      <a className="pill quick-pill" href="/">
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="quick-ico"><path d="M2 7.5 8 2.5l6 5M3.5 6.5V13h3.5V9.5h2V13h3.5V6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> Főoldal
      </a>
      <NotificationsButton />
      <button className="pill quick-pill" type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-leaderboard', { detail: lbTab ? { tab: lbTab } : {} }))}>
        <Icon src="/icons/Ranglista.png" size={16} className="quick-ico" /> Ranglista
      </button>
      <a className="pill quick-pill" href={kisokos}>
        <Icon src="/icons/Tutorial.png" size={15} className="quick-ico" /> Kisokos
      </a>
      <button className="pill quick-pill" type="button" aria-label={`Trófeák: ${count} / ${ACHIEVEMENTS.length} megszerezve`} title="Trófeák" onClick={() => window.dispatchEvent(new CustomEvent('open-achievements', { detail: { game } }))}>
        <Icon src="/icons/Trofeak.png" size={16} /> {count}/{ACHIEVEMENTS.length}
      </button>
    </div>
  );
}
