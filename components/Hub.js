'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { GameTile } from './GameFooter';
import { loadProgress } from '../lib/progress';
import { todayStr } from '../lib/date';
import { dailyDone } from '../lib/dailyDone';

// Főoldal: a három játék egyforma csempéje, egymás alatt, a megszokott tartalomszélességben, alattuk
// a napi sudoku. A kos csak a NAPITITKOS.HU főcímben szerepel. Bejelentkezve a már
// teljesített rejtvények (a mai titkosírás, a mai szókereső minden szava, a heti mini) csempéjén
// jobbra egy lila pipa jelenik meg.
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
      const d = dailyDone(loadProgress(), todayStr());
      setDone({ titkos: d.titkos, szo: d.szo, mini: d.mini, sudoku6: d.sudoku6, sudoku9: d.sudoku9 });
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
      <h1 className="sr-only">Napititkos.hu - Minden nap új rejtvények! Kriptikus rejtvény, Szókereső, Sudoku, Mini keresztrejtvény</h1>
      <div className="hub">
        <GameTile game="titkos" big done={done.titkos} />
        <GameTile game="szo" big isNew done={done.szo} />
        {/* Sudoku: két jelölődoboz (6×6 és 9×9), alattuk a méret, mindkettő a saját rejtvényére
            visz; ha az egyik kész, maga a csempe a másikra visz. */}
        <GameTile
          game="sudoku"
          big
          isNew
          href={done.sudoku6 && !done.sudoku9 ? '/sudoku?m=9' : '/sudoku'}
          checks={[
            { label: '6×6', done: !!done.sudoku6, href: '/sudoku' },
            { label: '9×9', done: !!done.sudoku9, href: '/sudoku?m=9' },
          ]}
        />
        <GameTile game="mini" big isNew done={done.mini} />
      </div>
    </div>
  );
}
