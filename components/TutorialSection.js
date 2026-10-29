'use client';
import { Fragment } from 'react';
import TutorialPuzzle from './TutorialPuzzle';
import { TUTORIAL_TASKS } from '../lib/tutorialPuzzles';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

// Egy Kisokos-szakasz (szójáték, betűjáték, joker) feladatai: mindegyik az előző megoldása
// után jelenik meg. A haladást a Kisokos oldal adja (progress), így a szerverről érkező
// (bejelentkezéskor összefésült) eredmények is azonnal érvényesek: a már megoldott feladat
// megoldva látszik, és a kos csak a még meg nem oldott feladatnál szól.
export default function TutorialSection({ sec, progress, onProgress }) {
  const tasks = TUTORIAL_TASKS[sec];
  const done = tasks.map((_, i) => !!progress?.[`${sec}_${i + 1}`]);

  function save(which) {
    const p = loadTutorialProgress();
    p[`${sec}_${which}`] = 1;
    p[sec] = tasks.reduce((n, _, i) => n + (p[`${sec}_${i + 1}`] || 0), 0);
    saveTutorialProgress(p);
    onProgress && onProgress(p);
  }

  return (
    <div style={{ marginTop: 6 }}>
      {tasks.map((task, i) =>
        i === 0 || done[i - 1] ? (
          <Fragment key={task.id}>
            {i > 0 && <div className="tut-sep" />}
            <TutorialPuzzle task={task} solved={done[i]} onSolved={() => save(i + 1)} />
          </Fragment>
        ) : null
      )}
    </div>
  );
}
