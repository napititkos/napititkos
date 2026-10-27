'use client';
import { useEffect, useState } from 'react';
import PuzzlePlayer from './PuzzlePlayer';
import RamCoach from './RamCoach';
import { isIntroSeen, markIntroSeen } from '../lib/tutorial';

// Egy Kisokos-feladat: számozott cím, mellette a kos gomb (újra elmondja a bevezetőt), és a játék
// megszokott megoldó felülete (tippek kijelöléssel; megfejtés után a megfejtés látszik, és nem
// lehet újra beírni). A bevezető (és anagrammánál a Keverés-üzenet) csak elsőre jön magától.
export default function TutorialPuzzle({ task, solved, onSolved, hideShuffle = false }) {
  const [coach, setCoach] = useState(null); // null | 'intro' | 'shuffle'
  const [manual, setManual] = useState(false); // a kos gombbal kérte-e (akkor megoldva is látszik)
  const scope = `tut-${task.id}`;
  // A kos magától csak a még meg nem oldott, és még nem olvasott feladatnál szól. Ha a feladat
  // megoldottá válik (itt, vagy a szerverről érkező haladásból), a magától nyílt üzenet bezárul,
  // és a bevezető olvasottnak számít.
  useEffect(() => {
    if (solved) {
      markIntroSeen(task.id);
      setCoach((c) => (c && !manual ? null : c));
    } else if (!isIntroSeen(task.id)) {
      setCoach('intro');
    }
  }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (coach === 'intro' && task.shuffleCoach) setCoach('shuffle');
    else {
      setCoach(null);
      setManual(false);
      markIntroSeen(task.id);
    }
  }

  return (
    <div className={`tut-puzzle ${scope}`}>
      <div className="tut-title-row">
        <h4 className="tut-task-title">{task.title}</h4>
        <button type="button" className="tut-ram-btn" aria-label="A kos magyarázata" title="A kos magyarázata" onClick={() => {
            setManual(true);
            setCoach('intro');
          }}>
          <img src="/logo-96.png" alt="" aria-hidden="true" width={34} height={34} />
        </button>
      </div>
      {/* A mentett állapot betöltésekor (megoldva) újraépül, hogy a megfejtés és a tippek látsszanak. */}
      <PuzzlePlayer key={solved ? 'kesz' : 'uj'} puzzle={task.puzzle} initiallySolved={solved} onSolved={onSolved} hideShuffle={hideShuffle} />
      {coach === 'intro' && (
        <RamCoach target={`.${scope} .clue-box`} place="below" onOk={next}>
          {task.intro}
        </RamCoach>
      )}
      {coach === 'shuffle' && (
        <RamCoach
          target={solved ? `.${scope} .clue-box` : `.${scope} .pa-left button.play-btn`}
          place="above"
          okLabel="Kipróbálom!"
          onOk={next}
        >
          {task.shuffleCoach}
        </RamCoach>
      )}
    </div>
  );
}
