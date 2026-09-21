'use client';
import { useState } from 'react';
import LetterBoxes from './LetterBoxes';
import Icon from './Icon';
import { fireConfetti } from './Confetti';
import { HINT_LABELS, HINT_ORDER, norm, emptyGuess, emptyLocked } from '../lib/puzzleLogic';
import { enumerationFor } from '../lib/format';

export default function PuzzlePlayer({ puzzle, onSolved, initiallySolved = false }) {
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
      if (ch !== ' ' && norm(nextGuess[pos]) !== norm(ch)) candidates.push(pos);
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

  function noMoreLettersToReveal() {
    const answerChars = Array.from(puzzle.answer);
    return !answerChars.some((ch, pos) => ch !== ' ' && norm(guess[pos]) !== norm(ch));
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

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
      <div className="clue-box" style={{ marginBottom: 10 }}>
        <div className="clue-text">
          {puzzle.clue} {enumerationFor(puzzle.answer)}
        </div>
      </div>

      {!answered && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-flex', maxWidth: 'calc(100% - 104px)', minWidth: 0 }}>
              <button
                className="ghost small"
                disabled={!isRowFull()}
                onClick={shuffleGuess}
                title="A beírt betűk véletlenszerű összekeverése"
                style={{
                  position: 'absolute',
                  right: 'calc(100% + 8px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '9px 11px',
                }}
              >
                <Icon src="/icons/Rejtveny_Keveres.png" size={16} /> <span className="keveres-label">Keverés</span>
              </button>
              <LetterBoxes
                answer={puzzle.answer}
                value={guess}
                locked={lockedLetters}
                onChange={setGuess}
                disabled={answered}
                onEnter={() => checkAnswer(guess.join(''))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <button className="primary" onClick={() => checkAnswer(guess.join(''))}>
              Ellenőrzés
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {availableHints.length > 0 && (
              <button className="ghost small" onClick={() => setShowHintModal(true)}>
                <Icon src="/icons/Rejtveny_tippek.png" size={16} /> Tippek ({hintsUsed()} felhasználva)
              </button>
            )}
            <button className="ghost small" onClick={giveUp}>
              Feladom
            </button>
          </div>

          {revealed.map((t) => (
            <div className="hint-box" key={t}>
              {t === 'betu' ? (
                <>
                  <b>Helyes betű:</b> Eddig {betuCount} betűt fedtünk fel a válaszban.
                </>
              ) : (
                <>
                  <b>{HINT_LABELS[t]}:</b> {puzzle.hints[t].text}
                </>
              )}
            </div>
          ))}
        </>
      )}

      {answered && (
        <>
          <div className="answer-row">
            <LetterBoxes answer={puzzle.answer} value={guess} locked={lockedLetters} onChange={() => {}} disabled={true} />
          </div>
          <div className={`feedback ${correct ? 'good' : 'hint'}`}>
            {correct ? '✓ Helyes válasz!' : `A válasz: ${puzzle.answer}`}
          </div>
        </>
      )}

      {showHintModal && (
        <div className="modal-overlay hint-modal-overlay" onClick={() => setShowHintModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Baloo 2, sans-serif', color: 'var(--accent)', marginTop: 0 }}>
              <Icon src="/icons/Rejtveny_tippek.png" size={22} /> Tippek
            </h2>
            {availableHints.some((t) => t !== 'betu' && !revealed.includes(t)) && (
              <button
                className="primary small"
                style={{ marginBottom: 12 }}
                onClick={() =>
                  setRevealed((prev) => Array.from(new Set([...prev, ...availableHints.filter((t) => t !== 'betu')])))
                }
              >
                Összes szöveges tipp megjelenítése
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {availableHints.map((t) => {
                const isBetu = t === 'betu';
                const used = isBetu ? false : revealed.includes(t);
                const exhausted = isBetu && noMoreLettersToReveal();
                return (
                  <div key={t} style={{ border: '2px solid var(--line)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <b>{HINT_LABELS[t]}</b>
                      <button
                        className={used ? 'ghost small' : 'primary small'}
                        disabled={used || exhausted}
                        onClick={() => (isBetu ? revealLetterHint() : revealHint(t))}
                      >
                        {isBetu ? (exhausted ? 'Nincs több betű' : 'Kérek egy betűt') : used ? 'Felhasználva ✓' : 'Ezt kérem'}
                      </button>
                    </div>
                    {!isBetu && used && (
                      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
                        {puzzle.hints[t].text}
                      </p>
                    )}
                    {isBetu && betuCount > 0 && (
                      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
                        Eddig {betuCount} betűt fedtünk fel.
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
