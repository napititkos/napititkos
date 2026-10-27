'use client';
import { useEffect, useState } from 'react';
import TutorialExtraTask from './TutorialExtraTask';
import LetterBoxes from './LetterBoxes';
import { fireConfetti } from './Confetti';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';
import RamCoach from './RamCoach';

const ANSWER = 'PÁRNA';
const CLUE = 'Na, na! Hát hol hajtsak fejet?';

function norm(s) {
  return (s || '').trim().toUpperCase();
}

export default function JokerExample({ onProgress }) {
  const [guess, setGuess] = useState(Array(ANSWER.length).fill(''));
  const [showHelp, setShowHelp] = useState(false);
  const [solved, setSolved] = useState(false);
  const [intro1Seen, setIntro1Seen] = useState(false); // az 1. feladat bevezetője a kos üzeneteként
  const [wrongTried, setWrongTried] = useState(false);

  // A szekció gyakorlatai (joker_1, joker_2); a szekció haladása a megoldottak száma.
  const [done2, setDone2] = useState(false);
  useEffect(() => {
    const progress = loadTutorialProgress();
    // Korábbi verzió: egyetlen gyakorlat volt (joker = 1) - az az 1. gyakorlatnak számít.
    // (Más eszközről szinkronizálva csak a darabszám érkezik: abból állítjuk vissza.)
    if (progress.joker >= 1 && !progress.joker_1 && !progress.joker_2) progress.joker_1 = 1;
    if (progress.joker >= 2) {
      progress.joker_1 = 1;
      progress.joker_2 = 1;
    }
    if (progress.joker_1) setSolved(true);
    if (progress.joker_2) setDone2(true);
  }, []);
  function saveTask(which) {
    const progress = loadTutorialProgress();
    if (which === 1) progress.joker_1 = 1;
    if (which === 2) progress.joker_2 = 1;
    progress.joker = (progress.joker_1 || 0) + (progress.joker_2 || 0);
    saveTutorialProgress(progress);
    onProgress && onProgress(progress);
  }

  function checkAnswer() {
    if (norm(guess.join('')) === norm(ANSWER)) {
      setSolved(true);
      fireConfetti();
      saveTask(1);
    } else {
      setWrongTried(true);
    }
  }

  return (
    <div className="tut-ex1" style={{ marginTop: 10 }}>
      <h4 className="tut-task-title">1. kreatív olvasat</h4>
      {!solved && !intro1Seen && (
        <RamCoach target=".tut-ex1 .clue-box" place="below" onOk={() => setIntro1Seen(true)}>
          A jokernél sokszor kreatívan kell gondolkodni egy rejtvénynél - néha meg kell
        kérdőjelezni akár olyasmit is, amit eddig biztosnak gondoltunk. Ebben a rejtvényben
        például nincs egyértelmű mutató, csak készlet és definíció. Ki tudod találni, mit takar?
        </RamCoach>
      )}
      <div className="clue-box" style={{ marginBottom: 10 }}>
        <div className="clue-text">{CLUE}</div>
      </div>

      {!solved && (
        <>
          <div className="answer-row" style={{ marginLeft: 0, justifyContent: 'center' }}>
            <LetterBoxes
              answer={ANSWER}
              value={guess}
              locked={ANSWER.split('').map(() => false)}
              onChange={setGuess}
              disabled={false}
              onEnter={checkAnswer}
            />
          </div>
<div className="play-actions-wrap">
            <div className="play-actions tutorial-actions">
              <div className="pa-left"></div>
              <button className="primary play-btn" onClick={checkAnswer}>
                Ellenőrzés
              </button>
              <div className="pa-right">{!showHelp && (
                  <button className="primary play-btn" onClick={() => setShowHelp(true)}>
                    💡 Tipp
                  </button>
                )}</div>
            </div>
          </div>

          {wrongTried && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              Még nem ez az. Gondolkodj kreatívan - néha a hangzás vezet el a megoldáshoz!
            </div>
          )}
          {showHelp && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              A „Na, na!” nem csak egy felkiáltás: ez két darab „na”. Hogyan lehetne ezt
              másképp, egyetlen szóval leírni? És mi köze lehet ennek a definícióhoz: „hol hajtsak
              fejet?”
            </div>
          )}
        </>
      )}

      {solved && (
        <div className="feedback good" style={{ marginLeft: 0 }}>
          ✓ Pontosan! A "Na, na!" valójában egy "PÁR NA" (két "na"), a "hol hajtsak fejet"
          pedig a definíció - együtt: PÁRNA. Ez a joker lényege: néha nincs egyértelmű jelzés,
          csak rá kell érezni a trükkre!
        </div>
      )}
      {solved && (
        <TutorialExtraTask
          title="2. formabontó rejtvény"
          intro="Sokszor egészen formabontó rejtvényekkel találkozhatsz, ami már a képrejtvény határát súrolják. Mondd, miből látsz itt mennyit?"
          clue="Ausztria -500Ft, Ukrajna -1000Ft, Szlovákia -1500Ft, Szlovénia -400Ft, Románia -800Ft, Szerbia -600Ft"
          answer="HATÁR"
          hints={[
            'Nézd meg, mi szerepel a listában: országok, és mindegyik mellett egy összeg. Mi köti össze ezeket az országokat Magyarországgal?',
            'Hat darab ár van valamiből, mi lehet a megfejtés?',
          ]}
          wrongText="Még nem ez az. Számold meg, hány összeg (ár) szerepel a listában, és gondold végig, mi közös az országokban!"
          solvedText="✓ Pontosan! A listában hat ár szerepel - hat ár: HATÁR, és mind a hat ország a határunkon fekszik. A megfejtés: HATÁR."
          initiallySolved={done2}
          onSolved={() => {
            setDone2(true);
            saveTask(2);
          }}
        />
      )}
    </div>
  );
}
