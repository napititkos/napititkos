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
    </div>
  );
}
