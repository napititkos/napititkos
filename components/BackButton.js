'use client';
import { useEffect, useState } from 'react';

// Vissza gomb az aloldalakon. Élesítés előtt „Főoldal” (a napi titkosírás a főoldalon van);
// utána „Játék”, és a megfelelő játékhoz visz: a ?tab=mini / ?tab=szo fül szerint, vagy a
// megadott játékhoz, alapból a titkosíráshoz.
const HREF = { titkos: '/titkosiras', mini: '/mini', szo: '/szokereso' };

export default function BackButton({ game, className = '' }) {
  const [live, setLive] = useState(true);
  const [g, setG] = useState(game || 'titkos');
  useEffect(() => {
    try {
      if (localStorage.getItem('mini-live') === '1') setLive(true);
      const t = new URLSearchParams(window.location.search).get('tab');
      if (!game && (t === 'mini' || t === 'szo')) setG(t);
    } catch {}
    fetch('/api/mini/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(!!d?.live))
      .catch(() => {});
    const onTab = (e) => !game && setG(e.detail === 'mini' || e.detail === 'szo' ? e.detail : 'titkos');
    window.addEventListener('rejtveny-tab', onTab);
    return () => window.removeEventListener('rejtveny-tab', onTab);
  }, [game]);
  return (
    <a href={live ? HREF[g] : '/'} className={`back-home-btn ${className}`.trim()}>
      <svg className="back-arrow" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13 8H3M7.5 3.5 3 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>{' '}
      {live ? 'Játék' : 'Főoldal'}
    </a>
  );
}
