'use client';
import { useState } from 'react';
import LetterBoxes from './LetterBoxes';
import { fireConfetti } from './Confetti';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

const ANSWER = 'PÁRNA';
const CLUE = 'Na, na! Hát hol hajtsak fejet?';

function norm(s) {
  return (s || '').trim().toUpperCase();
}

export default function JokerExample({ onProgress }) {
  const [guess, setGuess] = useState(Array(ANSWER.length).fill(''));
  const [showHelp, setShowHelp] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrongTried, setWrongTried] = useState(false);

  function checkAnswer() {
    if (norm(guess.join('')) === norm(ANSWER)) {
      setSolved(true);
      fireConfetti();
      const progress = loadTutorialProgress();
      progress.joker = 1;
      saveTutorialProgress(progress);
      onProgress && onProgress(progress);
    } else {
      setWrongTried(true);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
        A jokernél sokszor kreatívan kell gondolkodni egy rejtvénynél - néha meg kell
        kérdőjelezni akár olyasmit is, amit eddig biztosnak gondoltunk. Ebben a rejtvényben
        például nincs egyértelmű mutató, csak készlet és definíció. Ki tudod találni, mit takar?
      </p>
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            <button className="primary small" onClick={checkAnswer}>
              Ellenőrzés
            </button>
            {!showHelp && (
              <button className="ghost small" onClick={() => setShowHelp(true)}>
                Segítség kérése
              </button>
            )}
          </div>

          {wrongTried && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              Még nem ez az. Gondolkodj kreatívan - néha a hangzás vezet el a megoldáshoz!
            </div>
          )}
          {showHelp && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              A "Na, na!" nem csak egy felkiáltás - mondd ki hangosan: ez egy "PÁR NA", vagyis két
              "na" egymás mellett. Ez adja a válasz elejét és a folytatását is.
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
    </div>
  );
}
