'use client';
import TutorialPuzzle from './TutorialPuzzle';
import { TUTORIAL_TASKS } from '../lib/tutorialPuzzles';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

// Egy Kisokos-szakasz (szójáték, betűjáték, joker) két feladata: a második az első megoldása
// után jelenik meg. A haladást a Kisokos oldal adja (progress), így a szerverről érkező
// (bejelentkezéskor összefésült) eredmények is azonnal érvényesek: a már megoldott feladat
// megoldva látszik, és a kos csak a még meg nem oldott feladatnál szól.
export default function TutorialSection({ sec, progress, onProgress }) {
  const tasks = TUTORIAL_TASKS[sec];
  const done = [!!progress?.[`${sec}_1`], !!progress?.[`${sec}_2`]];

  function save(which) {
    const p = loadTutorialProgress();
    p[`${sec}_${which}`] = 1;
    p[sec] = (p[`${sec}_1`] || 0) + (p[`${sec}_2`] || 0);
    saveTutorialProgress(p);
    onProgress && onProgress(p);
  }

  return (
    <div style={{ marginTop: 6 }}>
      <TutorialPuzzle key={tasks[0].id} task={tasks[0]} solved={done[0]} onSolved={() => save(1)} />
      {done[0] && (
        <>
          <div className="tut-sep" />
          <TutorialPuzzle key={tasks[1].id} task={tasks[1]} solved={done[1]} onSolved={() => save(2)} />
        </>
      )}
    </div>
  );
}
