'use client';
import { useEffect, useState } from 'react';
import SzoGame from '../../components/SzoGame';
import GameBar from '../../components/GameBar';
import Icon from '../../components/Icon';
import Logo from '../../components/Logo';
import GameFooter from '../../components/GameFooter';
import { deviceId } from '../../lib/device';

// A napi szókereső oldala (csak élesítés után).
export default function SzokeresoPage() {
  const [data, setData] = useState(null);
  // Első látogatáskor üdvözlő ablak (mint a titkosírásnál), a Kisokosra mutató gombbal.
  const [intro, setIntro] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('szo_intro_seen')) setIntro(true);
    } catch {}
  }, []);
  const dismissIntro = () => {
    setIntro(false);
    try {
      localStorage.setItem('szo_intro_seen', '1');
    } catch {}
  };
  // A rejtvényt azonnal betöltjük (a bejelentkezési süti a kéréssel együtt megy, nem kell
  // megvárni a munkamenet állapotát), így a rejtvény jelenik meg elsőként.
  useEffect(() => {
    const dev = deviceId();
    fetch(`/api/szo${dev ? `?device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ live: false }));
  }, []);
  return (
    <div className="wrap">
      {intro && (
        <div className="modal-overlay" onClick={dismissIntro}>
          <div className="modal-card intro-card" role="dialog" aria-label="Üdv a Szókeresőben!" onClick={(e) => e.stopPropagation()}>
            <div className="intro-logo">
              <Logo size={102} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em', textAlign: 'center' }}>Üdv a Szókeresőben!</h2>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              Minden nap új 3×3-as szókeresőt oldhatsz meg, azonban van pár szabály, ami ismeretlen lehet, ehhez nézd át a Kisokost!
            </p>
            <div className="intro-actions">
              <button className="ghost" onClick={dismissIntro}>
                Bezárás
              </button>
              <a className="intro-kisokos" href="/kisokos?tab=szo" onClick={dismissIntro}>
                <Icon src="/icons/Tutorial.png" size={18} className="icon-on-accent" />
                Kisokos
              </a>
            </div>
          </div>
        </div>
      )}
      <GameBar game="szo" />
      <h1 className="sr-only">Szókereső</h1>
      <div className="card">
        {!data ? (
          <p>Betöltés…</p>
        ) : !data.live || !data.grid ? (
          <p>A napi szókereső hamarosan érkezik.</p>
        ) : (
          <>
            <SzoGame key={data.date} data={data} />
          </>
        )}
      </div>
      {data?.live && <GameFooter game="szo" />}
    </div>
  );
}
