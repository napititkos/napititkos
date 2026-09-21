'use client';
import { useState } from 'react';
import LetterBoxes from './LetterBoxes';
import { fireConfetti } from './Confetti';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

const ANSWER = 'MAJOM';
const CLUE = 'A malom középső tengelye elgörbült - ma ki oldja ezt meg?';

function norm(s) {
  return (s || '').trim().toUpperCase();
}

export default function BetujatekExample({ onProgress }) {
  const [guess, setGuess] = useState(Array(ANSWER.length).fill(''));
  const [stage, setStage] = useState(0); // 0: alap, 1: kiemelt szó, 2: mutató is látszik
  const [solved, setSolved] = useState(false);
  const [wrongTried, setWrongTried] = useState(false);

  function checkAnswer() {
    if (norm(guess.join('')) === ANSWER) {
      setSolved(true);
      fireConfetti();
      const progress = loadTutorialProgress();
      progress.betujatek = 1;
      saveTutorialProgress(progress);
      onProgress && onProgress(progress);
    } else {
      setWrongTried(true);
      if (stage < 1) setStage(1);
    }
  }

  function renderClueWithHighlight() {
    if (stage < 1) return CLUE;
    const parts = CLUE.split(/(malom)/i);
    return parts.map((part, i) =>
      /^malom$/i.test(part) ? (
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
        Betűjátéknál egyes betűket kell megváltoztatni, pakolgatni, formálni - próbáld ki ezen a
        példán!
      </p>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{renderClueWithHighlight()}</div>

      {!solved && (
        <>
          <div className="answer-row" style={{ marginLeft: 0 }}>
            <LetterBoxes
              answer={ANSWER}
              value={guess}
              locked={ANSWER.split('').map(() => false)}
              onChange={setGuess}
              disabled={false}
              onEnter={checkAnswer}
            />
            <button className="primary small" onClick={checkAnswer}>
              Ellenőrzés
            </button>
          </div>

          {wrongTried && stage === 1 && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              Mi lehet a középső tengely, és milyen az, ha elgörbül?
            </div>
          )}

          {stage < 2 && (
            <button className="ghost small" style={{ marginTop: 8 }} onClick={() => setStage(2)}>
              💡 Mutató
            </button>
          )}
          {stage === 2 && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              A "malom" szó középső betűje egy "l" - ha ez "elgörbül", olyan alakot vehet fel,
              mint egy "j". Cseréld ki a középső betűt, és nézd meg, milyen szót kapsz!
            </div>
          )}
        </>
      )}

      {solved && (
        <div className="feedback good" style={{ marginLeft: 0 }}>
          ✓ Pontosan! A "malom" középső betűje ("l") "elgörbülve" "j"-vé válik, így lesz belőle
          "majom". Pont így működik egy igazi betűjáték-rejtvény!
        </div>
      )}
    </div>
  );
}
