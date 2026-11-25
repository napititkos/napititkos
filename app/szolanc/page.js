'use client';
import { useEffect, useState } from 'react';
import SzolancGame from '../../components/SzolancGame';
import GameBar from '../../components/GameBar';
import GameFooter from '../../components/GameFooter';
import KisokosIcon from '../../components/KisokosIcon';
import Logo from '../../components/Logo';
import { useFirstVisit } from '../../lib/firstVisit';
import { todayStr } from '../../lib/date';
import { deviceId } from '../../lib/device';
import { getIdentity } from '../../lib/identity';
import { recordSzolanc } from '../../lib/gameProgress';
import { openLeaderboardIfTop } from '../../lib/autoLeaderboard';

// Szólánc. A napi feladványt a szerver adja (az admin által beemelt, vagy a dátumból generált); a megoldást
// a szerver ellenőrzi és a ranglistára teszi (előbb a lépések száma, aztán az idő számít).
// ?d=ÉÉÉÉ-HH-NN: egy másik nap feladványa (teszteléshez; ranglistára csak a mai kerül).
export default function SzolancPage() {
  const [data, setData] = useState(null);
  const [intro, dismissIntro] = useFirstVisit('szolanc');
  useEffect(() => {
    let d = todayStr();
    try {
      const q = new URLSearchParams(window.location.search).get('d');
      if (/^\d{4}-\d{2}-\d{2}$/.test(q || '')) d = q;
    } catch {}
    fetch(`/api/szolanc?date=${d}&device=${deviceId()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p?.mine) recordSzolanc(p.date);
        setData(p || { error: true });
      })
      .catch(() => setData({ error: true }));
  }, []);
  function solved({ chain, elapsed }) {
    recordSzolanc(data.date);
    fetch('/api/szolanc/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: data.date, chain, elapsed, device: deviceId(), name: getIdentity().name }),
    }).catch(() => {});
    // Dobogós helyezésnél (legalább 5 megfejtéssel) a hullám után felúszik a ranglista.
    openLeaderboardIfTop('szolanc');
  }
  return (
    <div className="wrap">
      {intro && (
        <div className="modal-overlay" onClick={dismissIntro}>
          <div className="modal-card intro-card" role="dialog" aria-label="Üdv a Szóláncban!" onClick={(e) => e.stopPropagation()}>
            <div className="intro-logo">
              <Logo size={102} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em', textAlign: 'center' }}>Üdv a Szóláncban!</h2>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              Minden nap kapsz egy kezdő- és egy célszót. Juss el az egyikből a másikba úgy, hogy minden lépésben pontosan egy betűt cserélsz, és mindig létező szót kapsz (ragozott alakot is). Ha még nem ismered, nézd át a Kisokost!
            </p>
            <div className="intro-actions">
              <button className="ghost" onClick={dismissIntro}>
                Bezárás
              </button>
              <a className="intro-kisokos" href="/kisokos?tab=szolanc" onClick={dismissIntro}>
                <KisokosIcon size={18} />
                Kisokos
              </a>
            </div>
          </div>
        </div>
      )}
      <GameBar game="szolanc" />
      <h1 className="sr-only">Napititkos.hu - Szólánc</h1>
      <div className={`card${!data ? ' szl-loading' : ''}`}>{!data ? <p data-nosnippet="">Betöltés…</p> : data.error ? <p>A mai Szólánc nem tölthető be. Próbáld újra később!</p> : <SzolancGame key={data.date} data={data} onSolved={solved} />}</div>
      <GameFooter game="szolanc" />
    </div>
  );
}
