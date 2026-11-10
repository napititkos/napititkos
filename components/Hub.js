'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { GameTile } from './GameFooter';
import { loadProgress } from '../lib/progress';
import { todayStr } from '../lib/date';

// Főoldal: a három játék egyforma csempéje, egymás alatt, a megszokott tartalomszélességben, alattuk
// egy „Hamarosan…” csempe. A kos csak a NAPITITKOS.HU főcímben szerepel. Bejelentkezve a már
// teljesített rejtvények (a mai titkosírás, a mai szókereső minden szava, a heti mini) csempéjén
// jobbra egy lila pipa jelenik meg.
function weekStartOf(d) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export default function Hub() {
  const { status } = useSession();
  const [done, setDone] = useState({});
  useEffect(() => {
    if (status !== 'authenticated') return setDone({});
    const read = () => {
      const prog = loadProgress();
      const today = todayStr();
      let miniLocal = null;
      try {
        miniLocal = JSON.parse(localStorage.getItem('titkositas_mini_v1') || 'null');
      } catch {}
      const week = weekStartOf(today);
      setDone({
        titkos: !!prog.history?.[today]?.correct,
        szo: (prog.szoFullDays || []).includes(today),
        mini: (prog.miniWeeks || []).includes(week) || miniLocal?.week === week,
      });
    };
    read();
    window.addEventListener('progress-synced', read);
    return () => window.removeEventListener('progress-synced', read);
  }, [status]);
  return (
    <div className="wrap">
      <div className="hub">
        <GameTile game="titkos" big done={done.titkos} />
        <GameTile game="szo" big isNew done={done.szo} />
        <GameTile game="mini" big isNew done={done.mini} />
        <div className="card game-tile game-tile-big game-tile-soon" aria-label="Hamarosan új játék">
          <span className="soon-mark" aria-hidden="true">?</span>
          <span className="soon-text">Hamarosan…</span>
        </div>
      </div>
    </div>
  );
}
