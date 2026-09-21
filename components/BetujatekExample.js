'use client';
import { useEffect, useState } from 'react';
import LetterBoxes from './LetterBoxes';
import Icon from './Icon';
import { fireConfetti } from './Confetti';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

const ANSWER = 'MAJOM';
const CLUE = 'A malom középső tengelye elgörbült - ma ki oldja ezt meg?';

const ANAGRAM_ANSWER = 'TORNÁDÓ';
const ANAGRAM_CLUE = 'Ez az ortó dán még összetöri magát, ha ilyen gyorsan forog.';

function norm(s) {
  return (s || '').trim().toUpperCase();
}

export default function BetujatekExample({ onProgress }) {
  const [guess, setGuess] = useState(Array(ANSWER.length).fill(''));
  const [stage, setStage] = useState(0); // 0: alap, 1: kiemelt szó, 2: mutató is látszik
  const [solved, setSolved] = useState(false);
  const [wrongTried, setWrongTried] = useState(false);

  const [guess2, setGuess2] = useState(Array(ANAGRAM_ANSWER.length).fill(''));
  const [showHelp2, setShowHelp2] = useState(false);
  const [solved2, setSolved2] = useState(false);
  const [wrongTried2, setWrongTried2] = useState(false);
  const [flashShuffle, setFlashShuffle] = useState(false);

  useEffect(() => {
    const progress = loadTutorialProgress();
    if (progress.betujatek_1) setSolved(true);
    if (progress.betujatek_2) setSolved2(true);
  }, []);

  useEffect(() => {
    if (solved && !solved2) {
      const t = setTimeout(() => setFlashShuffle(true), 400);
      const t2 = setTimeout(() => setFlashShuffle(false), 1900);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, [solved, solved2]);

  function isRowFull2() {
    return ANAGRAM_ANSWER.split('').every((ch, pos) => ch === ' ' || !!guess2[pos]);
  }

  function shuffleGuess2() {
    if (!isRowFull2()) return;
    const letters = [...guess2];
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    setGuess2(letters);
  }

  function saveExerciseDone(which) {
    const progress = loadTutorialProgress();
    if (which === 1) progress.betujatek_1 = 1;
    if (which === 2) progress.betujatek_2 = 1;
    progress.betujatek = (progress.betujatek_1 || 0) + (progress.betujatek_2 || 0);
    saveTutorialProgress(progress);
    onProgress && onProgress(progress);
  }

  function checkAnswer() {
    if (norm(guess.join('')) === ANSWER) {
      setSolved(true);
      fireConfetti();
      saveExerciseDone(1);
    } else {
      setWrongTried(true);
      if (stage < 1) setStage(1);
    }
  }

  function checkAnswer2() {
    if (norm(guess2.join('')) === norm(ANAGRAM_ANSWER)) {
      setSolved2(true);
      fireConfetti();
      saveExerciseDone(2);
    } else {
      setWrongTried2(true);
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

  function renderAnagramClueWithHighlight() {
    if (!showHelp2) return ANAGRAM_CLUE;
    const parts = ANAGRAM_CLUE.split(/(ortó|dán)/i);
    return parts.map((part, i) =>
      /^(ortó|dán)$/i.test(part) ? (
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
              Mi lehet a középső tengely, és milyen az, ha elgörbül?
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
              A "malom" szó középső betűje egy "l" - ha ez "elgörbül", olyan alakot vehet fel,
              mint egy "j". Cseréld ki a középső betűt, és nézd meg, milyen szót kapsz! Egy
              másik trükk is elrejt egy nyomot: "ma ki oldja ezt meg?" - vagyis "MA" + "KI" =
              "MAKI". Ez a rejtvény definíciója! Milyen más szó lehet a makira, egy hozzá
              hasonló főemlősre?
            </div>
          )}
        </>
      )}

      {solved && (
        <div className="feedback good" style={{ marginLeft: 0 }}>
          ✓ Pontosan! A "malom" középső betűje ("l") "elgörbülve" "j"-vé válik, így lesz belőle
          "majom" - és a "ma ki oldja ezt meg?" rész is elárulta: "MA" + "KI" = "MAKI", ami egy
          rokon szó a majomra. Pont így működik egy igazi betűjáték-rejtvény!
        </div>
      )}

      {solved && (
        <>
          <div style={{ borderTop: '1px dashed var(--line)', margin: '18px 0 14px' }} />

          <b style={{ fontSize: 14 }}>2. gyakorlat: anagramma</b>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '6px 0 10px' }}>
            Az "összetörő", "zavaros", "zúzós" szavak anagramma-jelzők: a készlet szavak
            betűit újrarendezve kapjuk a megfejtést. Van egy <b>Keverés</b> gombunk is ehhez -
            csak akkor használható, ha teleírtad a megoldást.
          </p>
          <div className="clue-box" style={{ marginBottom: 10 }}>
            <div className="clue-text">{renderAnagramClueWithHighlight()}</div>
          </div>

          {!solved2 && (
            <>
              <div className="answer-row" style={{ marginLeft: 0, justifyContent: 'center' }}>
                <LetterBoxes
                  answer={ANAGRAM_ANSWER}
                  value={guess2}
                  locked={ANAGRAM_ANSWER.split('').map(() => false)}
                  onChange={setGuess2}
                  disabled={false}
                  onEnter={checkAnswer2}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <button
                  className={`ghost small${flashShuffle ? ' flash-once' : ''}`}
                  disabled={!isRowFull2()}
                  onClick={shuffleGuess2}
                  title="A beírt betűk véletlenszerű összekeverése"
                >
                  <Icon src="/icons/Rejtveny_Keveres.png" size={16} /> <span className="keveres-label">Keverés</span>
                </button>
                <button className="primary small" onClick={checkAnswer2}>
                  Ellenőrzés
                </button>
                {!showHelp2 && (
                  <button className="ghost small" onClick={() => setShowHelp2(true)}>
                    Segítség kérése
                  </button>
                )}
              </div>

              {wrongTried2 && (
                <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
                  Még nem ez az - keresd meg a készlet szavakat a rejtvényben!
                </div>
              )}
              {showHelp2 && (
                <div className="hint-box" style={{ marginLeft: 0, marginTop: 10 }}>
                  Az "ortó" és a "dán" a készlet szavak. Ezeket összerakva (és a betűiket
                  újrarendezve) találsz egy olyan szót, ami gyorsan forog!
                </div>
              )}
            </>
          )}

          {solved2 && (
            <div className="feedback good" style={{ marginLeft: 0 }}>
              ✓ Pontosan! Az "ortó" + "dán" betűi összekeverve ("összetöri magát") kiadják a
              "tornádó" szót - ami tényleg gyorsan forog. Ez az anagramma-rejtvény lényege!
            </div>
          )}
        </>
      )}
    </div>
  );
}
