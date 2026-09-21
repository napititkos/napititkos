'use client';
import { useState } from 'react';
import LetterBoxes from './LetterBoxes';
import { fireConfetti } from './Confetti';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

const ANSWER = 'BORZALMAS';
const CLUE = 'Háborúban lelt ital, körülötte zavaros határokkal rejtve az alma - milyen ez?';

function norm(s) {
  return (s || '').trim().toUpperCase();
}

export default function SzojatekExample({ onProgress }) {
  const [guess, setGuess] = useState(Array(ANSWER.length).fill(''));
  const [stage, setStage] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongTried, setWrongTried] = useState(false);

  function checkAnswer() {
    if (norm(guess.join('')) === ANSWER) {
      setSolved(true);
      fireConfetti();
      const progress = loadTutorialProgress();
      progress.szojatek = 1;
      saveTutorialProgress(progress);
      onProgress && onProgress(progress);
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
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
        Szójátéknál teljes szavakat keresünk - gyakran szinonimákat, vagy egy adott kategórián
        belüli szavakat (pl. italok, állatok, színek). Próbáld ki ezen a példán!
      </p>
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
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <button className="primary small" onClick={checkAnswer}>
              Ellenőrzés
            </button>
          </div>

          {wrongTried && stage === 1 && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              A "háborúban" szó rejt egy italt - keresd meg, és rakd a megfejtés elejére!
            </div>
          )}

          {stage < 2 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <button className="ghost small" onClick={() => setStage(2)}>
                💡 Mutató
              </button>
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
          ✓ Pontosan! "Háborúban" → BOR, majd Z + ALMA + S következik - együtt: BORZALMAS. Pont
          így épül fel egy szójáték-rejtvény: apró darabokból összerakva egy egészen más szót
          kapunk!
        </div>
      )}
    </div>
  );
}
