'use client';
import { TutorialContent } from './TutorialModal';
import MiniKisokos from './MiniKisokos';
import SzoKisokos from './SzoKisokos';
import SudokuKisokos from './SudokuKisokos';
import BackButton from './BackButton';
import RejtvenyTabs, { useMiniLive, useRejtvenyTab } from './RejtvenyTabs';

// A Kisokos két része (a mini élesítése után): Titkosírás és Mini. A rejtvényekről mindig az adott
// rejtvény kisokosára jutunk (a minik oldala a ?tab=mini címre visz).
export default function KisokosTabs() {
  const live = useMiniLive();
  const [tab, setTab, ready] = useRejtvenyTab();
  if (!live) return <TutorialContent />;
  if (!ready) return null;
  return (
    <>
      {/* A játék választó egy sorban a vissza (Játék) gombbal, ami jobbra, eltérő színnel áll. */}
      <div className="kisokos-tabrow">
        <RejtvenyTabs tab={tab} onChange={setTab} labels={{ titkos: 'Titkosírás', szo: 'Szókereső', mini: 'Mini', sudoku: 'Sudoku' }} withSzo withSudoku />
        <BackButton pill className="kisokos-back" />
      </div>
      {tab === 'mini' ? <MiniKisokos /> : tab === 'szo' ? <SzoKisokos /> : tab === 'sudoku' ? <SudokuKisokos /> : <TutorialContent />}
    </>
  );
}
