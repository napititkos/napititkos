'use client';
import { useEffect, useState } from 'react';
import TutorialExtraTask from './TutorialExtraTask';
import LetterBoxes from './LetterBoxes';
import { fireConfetti } from './Confetti';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';
import RamCoach from './RamCoach';
import RamNote from './RamNote';

const ANSWER = 'BORZALMAS';
const CLUE = 'Háborúban lelt ital, majd zavaros határok közt talált alma. Rettenetes vacsora!';

function norm(s) {
  return (s || '').trim().toUpperCase();
}

export default function SzojatekExample({ onProgress }) {
  const [guess, setGuess] = useState(Array(ANSWER.length).fill(''));
  const [stage, setStage] = useState(0);
  const [solved, setSolved] = useState(false);
  const [intro1Seen, setIntro1Seen] = useState(false); // az 1. feladat bevezetője a kos üzeneteként
  const [wrongTried, setWrongTried] = useState(false);

  // A szekció gyakorlatai (szojatek_1, szojatek_2); a szekció haladása a megoldottak száma.
  const [done2, setDone2] = useState(false);
  useEffect(() => {
    const progress = loadTutorialProgress();
    // Korábbi verzió: egyetlen gyakorlat volt (szojatek = 1) - az az 1. gyakorlatnak számít.
    // (Más eszközről szinkronizálva csak a darabszám érkezik: abból állítjuk vissza.)
    if (progress.szojatek >= 1 && !progress.szojatek_1 && !progress.szojatek_2) progress.szojatek_1 = 1;
    if (progress.szojatek >= 2) {
      progress.szojatek_1 = 1;
      progress.szojatek_2 = 1;
    }
    if (progress.szojatek_1) setSolved(true);
    if (progress.szojatek_2) setDone2(true);
  }, []);
  function saveTask(which) {
    const progress = loadTutorialProgress();
    if (which === 1) progress.szojatek_1 = 1;
    if (which === 2) progress.szojatek_2 = 1;
    progress.szojatek = (progress.szojatek_1 || 0) + (progress.szojatek_2 || 0);
    saveTutorialProgress(progress);
    onProgress && onProgress(progress);
  }

  function checkAnswer() {
    if (norm(guess.join('')) === ANSWER) {
      setSolved(true);
      fireConfetti();
      saveTask(1);
    } else {
      setWrongTried(true);
      if (stage < 1) setStage(1);
    }
  }

  function renderClueWithHighlight() {
    if (stage < 1) return CLUE;
    const parts = CLUE.split(/(háborúban|alma)/i);
    return parts.map((part, i) =>
      /^(háborúban|alma)$/i.test(part) ? (
        <mark className="clue-highlight" key={i}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <div className="tut-ex1" style={{ marginTop: 10 }}>
      <h4 className="tut-task-title">1. szavakból építkezve</h4>
      {!solved && !intro1Seen && (
        <RamCoach target=".tut-ex1 .clue-box" place="below" onOk={() => setIntro1Seen(true)}>
          Szójátéknál teljes szavakat keresünk - gyakran szinonimákat, vagy egy adott kategórián
        belüli szavakat (pl. italok, állatok, színek). Próbáld ki ezen a példán!
        </RamCoach>
      )}
      {(solved || intro1Seen) && <RamNote>
          Szójátéknál teljes szavakat keresünk - gyakran szinonimákat, vagy egy adott kategórián
        belüli szavakat (pl. italok, állatok, színek). Próbáld ki ezen a példán!
      </RamNote>}
      <div className="clue-box" style={{ marginBottom: 10 }}>
        <div className="clue-text">{renderClueWithHighlight()}</div>
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
          {/* Ugyanolyan gombsor, mint a játékban: az Ellenőrzés középen, a tipp jobbra. */}
          <div className="play-actions-wrap">
            <div className="play-actions tutorial-actions">
              <div className="pa-left"></div>
              <button className="primary play-btn" onClick={checkAnswer}>
                Ellenőrzés
              </button>
              <div className="pa-right">{stage < 2 && (
                  <button className="primary play-btn" onClick={() => setStage(2)}>
                    💡 Tipp
                  </button>
                )}</div>
            </div>
          </div>

          {wrongTried && stage === 1 && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              A definíció itt a "Rettenetes" - erre keresünk egy szinonimát. A "háborúban" szó
              pedig rejt egy italt - keresd meg, és rakd a megfejtés elejére!
            </div>
          )}

          {stage === 2 && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              A "háborúban" szó közepén ott bújik a "bor" - ez lesz a válasz eleje. Utána egy
              zavaros (összekevert) két betűs határ következik, ami körbeöleli az "alma" szót -
              ezek a betűk: Z és S.
            </div>
          )}
        </>
      )}

      {solved && (
        <div className="feedback good" style={{ marginLeft: 0 }}>
          ✓ Pontosan! "Háborúban" → BOR, majd Z + ALMA + S következik - együtt: BORZALMAS, ami
          pontosan szinonimája a "Rettenetes" definíciónak. Pont így épül fel egy
          szójáték-rejtvény: apró darabokból összerakva egy egészen más szót kapunk, ami
          passzol a definícióval!
        </div>
      )}
      {solved && (
        <TutorialExtraTask
          title="2. kulturális utalás"
          intro="Szójátéknál gyakori a kultúrális-popkultúrális utalás, a baseball játékos itt megfeleltethető egy híres magyar emberrel, mert a neve egyezik egy baseballban található poszttal, mi lehet az összefüggés?"
          clue="Magyar baseball játékos elveri a török csapatot?"
          answer="DOBÓ"
          hints={[
            'Egy híres magyar ember, aki legyőzte a törököket - és a neve egy baseball-poszt neve is.',
            'Baseball posztok: dobó, ütő, elkapó.',
          ]}
          wrongText="Még nem ez az. Melyik baseball-poszt neve egyezik egy híres magyar ember nevével, aki a törökök ellen harcolt?"
          solvedText="✓ Pontosan! A baseballban az egyik poszt a dobó - Dobó István pedig Eger várában verte vissza a török sereget. A megfejtés: DOBÓ."
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
