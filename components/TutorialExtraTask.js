'use client';
import { useEffect, useState } from 'react';
import LetterBoxes from './LetterBoxes';
import { fireConfetti } from './Confetti';

// A tutorial egy szekciójának további (2.) gyakorlata: rejtvény, betűmezők, Ellenőrzés és egy
// tipp, megfejtés után a magyarázat. A haladást a szülő menti (onSolved).
function norm(s) {
  return (s || '').trim().toUpperCase();
}

// hints: egy vagy több tipp (sorban kérhetők, a Tipp gomb a következőt mutatja meg).
export default function TutorialExtraTask({ title, intro, clue, answer, hint, hints, wrongText, solvedText, initiallySolved = false, onSolved }) {
  const tips = hints || (hint ? [hint] : []);
  const [guess, setGuess] = useState(Array(answer.length).fill(''));
  const [solved, setSolved] = useState(initiallySolved);
  // Több tipp esetén az első alapból kint van szövegként, a Tipp gomb a következőt mutatja meg.
  const [shownTips, setShownTips] = useState(tips.length > 1 ? 1 : 0);
  const [wrongTried, setWrongTried] = useState(false);
  useEffect(() => setSolved(initiallySolved), [initiallySolved]);

  function check() {
    if (norm(guess.join('')) === norm(answer)) {
      setSolved(true);
      fireConfetti();
      onSolved && onSolved();
    } else {
      setWrongTried(true);
    }
  }

  return (
    <>
      <div style={{ borderTop: '1px dashed var(--line)', margin: '18px 0 14px' }} />
      <b style={{ fontSize: 14 }}>{title}</b>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '6px 0 10px' }}>{intro}</p>
      <div className="clue-box" style={{ marginBottom: 10 }}>
        <div className="clue-text">
          {clue} <span className="clue-enum">({answer.length})</span>
        </div>
      </div>
      {!solved && (
        <>
          <div className="answer-row" style={{ marginLeft: 0, justifyContent: 'center' }}>
            <LetterBoxes answer={answer} value={guess} locked={answer.split('').map(() => false)} onChange={setGuess} disabled={false} onEnter={check} />
          </div>
          <div className="play-actions-wrap">
            <div className="play-actions tutorial-actions">
              <div className="pa-left"></div>
              <button className="primary play-btn" onClick={check}>
                Ellenőrzés
              </button>
              <div className="pa-right">
                {shownTips < tips.length && (
                  <button className="primary play-btn" onClick={() => setShownTips((n) => n + 1)}>
                    💡 Tipp
                  </button>
                )}
              </div>
            </div>
          </div>
          {wrongTried && shownTips < tips.length && (
            <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              {wrongText}
            </div>
          )}
          {tips.slice(0, shownTips).map((t, i) => (
            <div key={i} className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
              {t}
            </div>
          ))}
        </>
      )}
      {solved && (
        <div className="feedback good" style={{ marginLeft: 0 }}>
          {solvedText}
        </div>
      )}
    </>
  );
}
