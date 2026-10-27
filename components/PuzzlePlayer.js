'use client';
import { useEffect, useState } from 'react';
import LetterBoxes from './LetterBoxes';
import PlayActions from './PlayActions';
import LookupHint from './LookupHint';
import ClueText from './ClueText';
import { HL_TYPES, highlightMap } from '../lib/clue';
import Icon from './Icon';
import { fireConfetti } from './Confetti';
import { HINT_LABELS, HINT_ORDER, norm, emptyGuess, emptyLocked, HINT_HELP } from '../lib/puzzleLogic';
import { enumerationFor } from '../lib/format';
import FieldHelp from './FieldHelp';

export default function PuzzlePlayer({ puzzle, onSolved, onGaveUp, initiallySolved = false, dateLabel = '' }) {
  const [guess, setGuess] = useState(() =>
    initiallySolved
      ? Array.from(puzzle.answer).map((ch) => (ch === ' ' ? ' ' : ch.toUpperCase()))
      : emptyGuess(puzzle.answer)
  );
  const [lockedLetters, setLockedLetters] = useState(() =>
    initiallySolved ? Array.from(puzzle.answer).map(() => true) : emptyLocked(puzzle.answer)
  );
  const [revealed, setRevealed] = useState([]);
  const [betuCount, setBetuCount] = useState(0);
  const [answered, setAnswered] = useState(initiallySolved);
  useEffect(() => {
    if (answered && document.activeElement?.classList?.contains('letter-box')) document.activeElement.blur();
  }, [answered]);
  const [correct, setCorrect] = useState(initiallySolved);
  const [showHintModal, setShowHintModal] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  function checkAnswer(value) {
    if (norm(value) === norm(puzzle.answer)) {
      setCorrect(true);
      setAnswered(true);
      fireConfetti();
      onSolved && onSolved();
    } else {
      showToast('Ez még nem az.');
    }
  }

  function giveUp() {
    const fullGuess = Array.from(puzzle.answer).map((ch) => (ch === ' ' ? ' ' : ch.toUpperCase()));
    setGuess(fullGuess);
    setLockedLetters(fullGuess.map(() => true));
    setAnswered(true);
    setCorrect(false);
    onGaveUp && onGaveUp();
  }

  function revealHint(type) {
    if (!revealed.includes(type)) setRevealed((prev) => [...prev, type]);
  }

  function revealLetterHint() {
    const answerChars = Array.from(puzzle.answer);
    const nextGuess = [...guess];
    const nextLocked = [...lockedLetters];
    const candidates = [];
    answerChars.forEach((ch, pos) => {
      // Bármelyik még nem rögzített hely sorra kerülhet, akkor is, ha ott már jó (vagy rossz)
      // betű áll: a véletlenül választott hely a helyes betűvel rögzül.
      if (ch !== ' ' && !nextLocked[pos]) candidates.push(pos);
    });
    if (candidates.length === 0) return;
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    nextGuess[idx] = answerChars[idx].toUpperCase();
    nextLocked[idx] = true;
    setGuess(nextGuess);
    setLockedLetters(nextLocked);
    setBetuCount((c) => c + 1);
    if (!revealed.includes('betu')) setRevealed((prev) => [...prev, 'betu']);
  }

  // Akkor nincs több kérhető betű, ha már minden hely rögzítve van (a beírt betűktől függetlenül).
  function noMoreLettersToReveal() {
    const answerChars = Array.from(puzzle.answer);
    return !answerChars.some((ch, pos) => ch !== ' ' && !lockedLetters[pos]);
  }

  function isRowFull() {
    const answerChars = Array.from(puzzle.answer);
    return answerChars.every((ch, pos) => ch === ' ' || !!guess[pos]);
  }

  function shuffleGuess() {
    if (!isRowFull()) return;
    const answerChars = Array.from(puzzle.answer);
    const movableIdx = answerChars
      .map((ch, pos) => (ch !== ' ' && !lockedLetters[pos] ? pos : null))
      .filter((v) => v !== null);
    if (movableIdx.length < 2) return;
    const letters = movableIdx.map((pos) => guess[pos]);
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const nextGuess = [...guess];
    movableIdx.forEach((pos, i) => {
      nextGuess[pos] = letters[i];
    });
    setGuess(nextGuess);
  }

  function hintsUsed() {
    return revealed.filter((t) => t !== 'betu').length + betuCount;
  }

  const availableHints = HINT_ORDER.filter(
    (t) => t === 'betu' || (puzzle.hints?.[t]?.enabled && puzzle.hints[t].text)
  );
  const hintsTotal =
    availableHints.filter((t) => t !== 'betu').length +
    (availableHints.includes('betu') ? Array.from(puzzle.answer).filter((c) => c !== ' ').length : 0);

  return (
    <div className="puzzle-player" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
      {/* dateLabel (opcionális): mint a főoldalon, balra a dátum, jobbra a beküldő. */}
      {dateLabel ? (
        <div className="topbar-sub player-sub">
          <span>{dateLabel}</span>
          {puzzle.submittedBy && <span className="submitted-by">Beküldte: {puzzle.submittedBy}</span>}
        </div>
      ) : (
        puzzle.submittedBy && <div className="submitted-by">Beküldte: {puzzle.submittedBy}</div>
      )}
      <div className="clue-box" style={{ marginBottom: 10 }}>
        <div className="clue-text">
          <ClueText clue={puzzle.clue} marks={highlightMap(puzzle.hints, answered ? HL_TYPES : revealed)} />{' '}
          <span className="clue-enum">{enumerationFor(puzzle.answer)}</span>
        </div>
      </div>

      {!answered && (
        <>
          <div className="player-letters" style={{ marginTop: 0 }}>
            <LetterBoxes
              answer={puzzle.answer}
              value={guess}
              locked={lockedLetters}
              onChange={setGuess}
              disabled={answered}
              onEnter={() => (isRowFull() ? checkAnswer(guess.join('')) : showToast('Töltsd ki előbb, vagy használj tippet, ha elakadtál!'))}
            />
          </div>
          <PlayActions
            rowFull={isRowFull()}
            onShuffle={shuffleGuess}
            onCheck={() => checkAnswer(guess.join(''))}
            onOpenHints={() => setShowHintModal(true)}
            hintsUsed={hintsUsed()}
            hintsTotal={hintsTotal}
            notify={showToast}
            compact
          />

          {revealed.filter((t) => t !== 'betu').map((t) => (
            <div className={`hint-box${HL_TYPES.includes(t) ? ` hl-type-${t}` : ''}`} key={t}>
              {HL_TYPES.includes(t) && <span className="hl-dot" />}
              <b>{HINT_LABELS[t]}:</b> {puzzle.hints[t].text}
            </div>
          ))}
        </>
      )}

      {answered && (
        <>
          <div className="answer-row">
            <LetterBoxes answer={puzzle.answer} value={guess} locked={lockedLetters} onChange={() => {}} disabled={true} />
          </div>
          {/* Helyes megfejtésnél nincs külön zöld buborék (a listában jelöljük, hogy megfejtetted). */}
          {!correct && <div className="feedback hint">{`A válasz: ${puzzle.answer}`}</div>}
        </>
      )}

      {showHintModal && (
        <div className="modal-overlay hint-modal-overlay" onClick={() => setShowHintModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0 }}>
              <Icon src="/icons/Rejtveny_tippek.png" size={22} /> Tippek
            </h2>
            <LookupHint lookup={puzzle.lookup} />
            {availableHints.some((t) => t !== 'betu' && !revealed.includes(t)) && (
              <button
                className="primary small"
                style={{ marginBottom: 12 }}
                onClick={() => {
                  setRevealed((prev) => Array.from(new Set([...prev, ...availableHints.filter((t) => t !== 'betu')])));
                  setShowHintModal(false);
                }}
              >
                Összes szöveges tipp megjelenítése
              </button>
            )}
            <div className="hint-options" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {availableHints.map((t) => {
                const isBetu = t === 'betu';
                const used = isBetu ? false : revealed.includes(t);
                const exhausted = isBetu && noMoreLettersToReveal();
                return (
                  <div
                    key={t}
                    className={HL_TYPES.includes(t) ? `hl-type-${t}` : undefined}
                    style={{ border: `2px solid ${HL_TYPES.includes(t) ? 'var(--hl-ink)' : 'var(--line)'}`, borderRadius: 12, padding: '10px 12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <b className="hint-name">
                        {HL_TYPES.includes(t) && <span className="hl-dot" />}
                        {HINT_LABELS[t]}
                        <FieldHelp label={HINT_LABELS[t]}>{HINT_HELP[t]}</FieldHelp>
                      </b>
                      <button
                        className={used ? 'ghost small' : `primary small${HL_TYPES.includes(t) ? ' hl-btn' : ''}`}
                        disabled={used || exhausted}
                        onClick={() => {
                          // Tipp kérésekor az ablak bezárul, hogy azonnal látszódjon a rejtvényben.
                          if (isBetu) revealLetterHint();
                          else revealHint(t);
                          setShowHintModal(false);
                        }}
                      >
                        {isBetu ? (exhausted ? 'Nincs több betű' : 'Kérek egy betűt') : used ? 'Felhasználva ✓' : 'Ezt kérem'}
                      </button>
                    </div>
                    {!isBetu && used && (
                      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
                        {puzzle.hints[t].text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="primary" onClick={() => setShowHintModal(false)}>
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
