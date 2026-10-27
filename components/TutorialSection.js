'use client';
import { useEffect, useState } from 'react';
import TutorialPuzzle from './TutorialPuzzle';
import { TUTORIAL_TASKS } from '../lib/tutorialPuzzles';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

// Egy Kisokos-szakasz (szójáték, betűjáték, joker) két feladata: a második az első megoldása
// után jelenik meg. A haladás: <szakasz>_1, <szakasz>_2, és a szakasz = a megoldottak száma.
export default function TutorialSection({ sec, onProgress }) {
  const tasks = TUTORIAL_TASKS[sec];
  const [done, setDone] = useState([false, false]);
  useEffect(() => {
    const p = loadTutorialProgress();
    // Más eszközről (szinkronból) csak a darabszám érkezhet: abból állítjuk vissza.
    if ((p[sec] || 0) >= 1 && !p[`${sec}_1`] && !p[`${sec}_2`]) p[`${sec}_1`] = 1;
    if ((p[sec] || 0) >= 2) {
      p[`${sec}_1`] = 1;
      p[`${sec}_2`] = 1;
    }
    setDone([!!p[`${sec}_1`], !!p[`${sec}_2`]]);
  }, [sec]);

  function save(which) {
    const p = loadTutorialProgress();
    p[`${sec}_${which}`] = 1;
    p[sec] = (p[`${sec}_1`] || 0) + (p[`${sec}_2`] || 0);
    saveTutorialProgress(p);
    setDone([!!p[`${sec}_1`], !!p[`${sec}_2`]]);
    onProgress && onProgress(p);
  }

  return (
    <div style={{ marginTop: 6 }}>
      <TutorialPuzzle task={tasks[0]} solved={done[0]} onSolved={() => save(1)} />
      {done[0] && (
        <>
          <div className="tut-sep" />
          <TutorialPuzzle key={tasks[1].id} task={tasks[1]} solved={done[1]} onSolved={() => save(2)} />
        </>
      )}
    </div>
  );
}
