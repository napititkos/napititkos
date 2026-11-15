'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { GameTile } from './GameFooter';
import { loadProgress } from '../lib/progress';
import { todayStr } from '../lib/date';

// Főoldal: a három játék egyforma csempéje, egymás alatt, a megszokott tartalomszélességben, alattuk
// a napi sudoku. A kos csak a NAPITITKOS.HU főcímben szerepel. Bejelentkezve a már
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
  // A mai dátum csak a böngészőben (a budapesti idő szerint), hogy éjfél körül se legyen eltérés.
  const [today, setToday] = useState(null);
  useEffect(() => {
    setToday(todayStr());
    const t = setInterval(() => setToday(todayStr()), 60000);
    return () => clearInterval(t);
  }, []);
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
        sudoku: (prog.sudokuDays || []).includes(today) || (prog.sudoku9Days || []).includes(today),
      });
    };
    read();
    window.addEventListener('progress-synced', read);
    return () => window.removeEventListener('progress-synced', read);
  }, [status]);
  return (
    <div className="wrap">
      {/* A mai dátum (éééé.hh.nn) a napititkos.hu felirat alatt, középen. */}
      <p className="hub-date" suppressHydrationWarning>
        {today ? today.replace(/-/g, '.') : '\u00a0'}
      </p>
      <h1 className="sr-only">napititkos.hu – napi magyar rejtvények: Titkosírás, Szókereső, Sudoku és Heti Mini</h1>
      <div className="hub">
        <GameTile game="titkos" big done={done.titkos} />
        <GameTile game="szo" big isNew done={done.szo} />
        <GameTile game="sudoku" big isNew done={done.sudoku} />
        <GameTile game="mini" big isNew done={done.mini} />
      </div>
    </div>
  );
}
