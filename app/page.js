'use client';
import { useEffect, useRef, useState } from 'react';
import { fireConfetti } from '../components/Confetti';

const HINT_LABELS = {
  fodder: 'Alapszavak',
  indikator: 'Mutató',
  definicio: 'Definíció',
  alternativ: 'Alternatív tipp',
  betu: 'Helyes betű',
};
const HINT_ORDER = ['definicio', 'indikator', 'fodder', 'alternativ', 'betu'];

const STORAGE_KEY = 'titkositas_progress_v1';
const norm = (s) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { lastDate: null, streak: 0, best: 0, history: {} };
  } catch {
    return { lastDate: null, streak: 0, best: 0, history: {} };
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}
function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}
function tileFor(count) {
  if (count <= 0) return '🟩';
  if (count === 1) return '🟨';
  if (count === 2) return '🟧';
  return '🟥';
}
function difficultyText(totalHints, parHints) {
  if (parHints == null) return null;
  const diff = totalHints - parHints;
  if (diff === 0) return 'Pontosan a nehézségnek megfelelően oldottad meg!';
  if (diff < 0) return `${Math.abs(diff)}-vel kevesebb tippet használtál, mint a nehézség — szép munka!`;
  return `${diff}-vel több tippet használtál, mint a nehézség.`;
}
function totalHintsFor(clueState) {
  return clueState.reduce(
    (sum, c) => sum + c.revealed.filter((t) => t !== 'betu').length + (c.betuCount || 0) + (c.gaveUp ? 1 : 0),
    0
  );
}
function numClass(count, answered) {
  if (!answered) return '';
  if (count <= 0) return 'good';
  if (count === 1) return 'h1';
  if (count === 2) return 'h2';
  return 'h3';
}
function emptyGuess(answer) {
  return Array.from(answer).map((ch) => (ch === ' ' ? ' ' : ''));
}
function emptyLocked(answer) {
  return Array.from(answer).map(() => false);
}

function LetterBoxes({ answer, value, locked, onChange, disabled, onEnter }) {
  const refs = useRef([]);
  const chars = Array.from(answer);

  function focusIndex(idx) {
    const el = refs.current[idx];
    if (el) el.focus();
  }
  function nextEditable(from) {
    let n = from;
    while (n < chars.length && (chars[n] === ' ' || locked[n])) n++;
    return n;
  }
  function prevEditable(from) {
    let p = from;
    while (p >= 0 && (chars[p] === ' ' || locked[p])) p--;
    return p;
  }

  return (
    <div className="letterbox-row">
      {chars.map((ch, idx) =>
        ch === ' ' ? (
          <div key={idx} style={{ width: 12, flex: '0 0 auto' }} />
        ) : (
          <input
            key={idx}
            ref={(el) => (refs.current[idx] = el)}
            type="text"
            inputMode="text"
            maxLength={1}
            className={`letter-box${locked[idx] ? ' locked' : ''}`}
            disabled={disabled || locked[idx]}
            value={value[idx] || ''}
            onChange={(e) => {
              const v = e.target.value.toUpperCase().slice(-1);
              const next = [...value];
              next[idx] = v;
              onChange(next);
              if (v) {
                const n = nextEditable(idx + 1);
                if (n < chars.length) focusIndex(n);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !value[idx]) {
                const p = prevEditable(idx - 1);
                if (p >= 0) focusIndex(p);
              } else if (e.key === 'Enter') {
                onEnter && onEnter();
              } else if (e.key === 'ArrowLeft') {
                const p = prevEditable(idx - 1);
                if (p >= 0) focusIndex(p);
              } else if (e.key === 'ArrowRight') {
                const n = nextEditable(idx + 1);
                if (n < chars.length) focusIndex(n);
              }
            }}
          />
        )
      )}
    </div>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [puzzleMeta, setPuzzleMeta] = useState(null);
  const [clueState, setClueState] = useState([]);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());
  const [progress, setProgress] = useState({ streak: 0, best: 0 });
  const [avgHints, setAvgHints] = useState(null);
  const [toast, setToast] = useState('');
  const timerRef = useRef(null);
  const toastTimeout = useRef(null);

  useEffect(() => {
    fetch('/api/puzzle')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg('Még nincs feltöltve egyetlen rejtvény sem. Nézz vissza hamarosan!');
          setLoading(false);
          return;
        }
        setPuzzle(data.puzzle);
        setPuzzleMeta({ index: data.index, total: data.total, date: data.date });
        setClueState(
          data.puzzle.clues.map((c) => ({
            answered: false,
            correct: false,
            gaveUp: false,
            revealed: [],
            betuCount: 0,
            guess: emptyGuess(c.answer),
            lockedLetters: emptyLocked(c.answer),
          }))
        );
        const prog = loadProgress();
        setProgress({ streak: prog.streak, best: prog.best });
        const saved = prog.history[data.date];
        if (saved) {
          setClueState(saved.clueState);
          setFinished(true);
          setElapsed(saved.elapsed);
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Nem sikerült betölteni a mai rejtvényt. Próbáld frissíteni az oldalt.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading || finished || !puzzle) return;
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), 500);
    return () => clearInterval(timerRef.current);
  }, [loading, finished, puzzle, startTime]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(''), 2600);
  }

  function hintsUsedFor(i) {
    const c = clueState[i];
    if (!c) return 0;
    const otherCount = c.revealed.filter((t) => t !== 'betu').length;
    return otherCount + (c.betuCount || 0) + (c.gaveUp ? 1 : 0);
  }

  function updateGuess(i, nextChars) {
    setClueState((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], guess: nextChars };
      return next;
    });
  }

  function checkAnswer(i, value) {
    const clue = puzzle.clues[i];
    if (norm(value) === norm(clue.answer)) {
      const next = [...clueState];
      next[i] = { ...next[i], answered: true, correct: true };
      setClueState(next);
      maybeFinish(next);
    } else {
      showToast('Ez még nem az. Próbálj egy tippet, ha elakadtál!');
    }
  }

  function revealHint(i, type) {
    const next = [...clueState];
    const c = next[i];
    if (!c.revealed.includes(type)) {
      next[i] = { ...c, revealed: [...c.revealed, type] };
      setClueState(next);
    }
  }

  function revealLetterHint(i) {
    const clue = puzzle.clues[i];
    const cs = clueState[i];
    const answerChars = Array.from(clue.answer);
    const guess = [...cs.guess];
    const locked = [...cs.lockedLetters];
    const idx = guess.findIndex(
      (ch, pos) => answerChars[pos] !== ' ' && norm(ch) !== norm(answerChars[pos])
    );
    if (idx === -1) return;
    guess[idx] = answerChars[idx].toUpperCase();
    locked[idx] = true;
    const next = [...clueState];
    next[i] = {
      ...cs,
      guess,
      lockedLetters: locked,
      betuCount: (cs.betuCount || 0) + 1,
      revealed: cs.revealed.includes('betu') ? cs.revealed : [...cs.revealed, 'betu'],
    };
    setClueState(next);
  }

  function noMoreLettersToReveal(i) {
    const clue = puzzle.clues[i];
    const cs = clueState[i];
    const answerChars = Array.from(clue.answer);
    return !answerChars.some((ch, pos) => ch !== ' ' && norm(cs.guess[pos]) !== norm(ch));
  }

  function giveUp(i) {
    const next = [...clueState];
    next[i] = { ...next[i], answered: true, correct: false, gaveUp: true };
    setClueState(next);
    maybeFinish(next);
  }

  function maybeFinish(next) {
    const allDone = next.every((c) => c.answered);
    if (allDone) finishGame(next);
  }

  function finishGame(finalState) {
    setFinished(true);
    const finalElapsed = Date.now() - startTime;
    setElapsed(finalElapsed);
    clearInterval(timerRef.current);
    fireConfetti();

    const totalHints = totalHintsFor(finalState);

    const prog = loadProgress();
    const today = puzzleMeta.date;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    if (prog.lastDate === yesterday) prog.streak += 1;
    else if (prog.lastDate !== today) prog.streak = 1;
    prog.best = Math.max(prog.best, prog.streak);
    prog.lastDate = today;
    prog.history[today] = { clueState: finalState, elapsed: finalElapsed };
    saveProgress(prog);
    setProgress({ streak: prog.streak, best: prog.best });

    fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, hintsUsed: totalHints }),
    }).catch(() => {});

    fetch(`/api/stats?date=${today}`)
      .then((r) => r.json())
      .then((d) => setAvgHints(d.average))
      .catch(() => {});
  }

  function shareText() {
    const tileRow = clueState.map((c, i) => tileFor(hintsUsedFor(i))).join('');
    const totalHints = totalHintsFor(clueState);
    const lines = [
      `Titkosírás · ${puzzleMeta?.date || ''}`,
      tileRow,
      `Idő: ${formatTime(elapsed)}`,
    ];
    if (puzzle?.parHints != null) {
      lines.push(difficultyText(totalHints, puzzle.parHints));
    }
    if (avgHints !== null) lines.push(`Átlag tipp/játékos ma: ${avgHints.toFixed(1)}`);
    return lines.join('\n');
  }

  function share() {
    const text = shareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('Eredmény vágólapra másolva!'));
    } else {
      showToast(text);
    }
  }

  if (loading) {
    return (
      <div className="wrap">
        <div className="card">Betöltés…</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="wrap">
        <div className="card">{errorMsg}</div>
      </div>
    );
  }

  const correctCount = clueState.filter((c) => c.correct).length;

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span className="pill">🔥 {progress.streak} napos sorozat</span>
      </div>

      <div className="card">
        <div className="topbar">
          <div className="puzzle-title">
            Napi rejtvény · #{(puzzleMeta?.index ?? 0) + 1}
          </div>
          <div className="timer">{formatTime(elapsed)}</div>
        </div>

        {puzzle.clues.map((clue, i) => {
          const cs = clueState[i];
          const availableHints = HINT_ORDER.filter(
            (t) => t === 'betu' || (clue.hints?.[t]?.enabled && clue.hints[t].text)
          );
          return (
            <div className="clue-row" key={i}>
              <div className="clue-head">
                <div className={`num ${numClass(hintsUsedFor(i), cs.answered)}`}>{i + 1}</div>
                <div className="clue-text">{clue.clue}</div>
              </div>

              {!cs.answered && (
                <>
                  <div className="answer-row">
                    <LetterBoxes
                      answer={clue.answer}
                      value={cs.guess}
                      locked={cs.lockedLetters}
                      onChange={(next) => updateGuess(i, next)}
                      disabled={cs.answered}
                      onEnter={() => checkAnswer(i, cs.guess.join(''))}
                    />
                    <button className="primary" onClick={() => checkAnswer(i, cs.guess.join(''))}>
                      Ellenőrzés
                    </button>
                    <button className="ghost small" onClick={() => giveUp(i)}>
                      Feladom, mutasd a választ
                    </button>
                  </div>
                  {availableHints.length > 0 && (
                    <div className="hintbar">
                      {availableHints.map((t) => (
                        <button
                          key={t}
                          className="ghost small"
                          disabled={t === 'betu' ? noMoreLettersToReveal(i) : cs.revealed.includes(t)}
                          onClick={() => (t === 'betu' ? revealLetterHint(i) : revealHint(i, t))}
                        >
                          💡 {HINT_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  )}
                  {cs.revealed.map((t) => (
                    <div className="hint-box" key={t}>
                      {t === 'betu' ? (
                        <>
                          <b>Helyes betű:</b> Eddig {cs.betuCount || 0} betűt fedtünk fel a válaszban.
                        </>
                      ) : (
                        <>
                          <b>{HINT_LABELS[t]}:</b> {clue.hints[t].text}
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}

              {cs.answered && (
                <div className={`feedback ${cs.correct ? 'good' : 'hint'}`}>
                  {cs.correct
                    ? hintsUsedFor(i) === 0
                      ? '✓ Helyes válasz, tipp nélkül!'
                      : `✓ Helyes válasz (${hintsUsedFor(i)} tipp felhasználva)`
                    : `A válasz: ${clue.answer}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {finished && (
        <div className="card result">
          <h2>Kész vagy!</h2>
          <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Idő: {formatTime(elapsed)}</div>
          <div className="squares">
            {clueState.map((c, i) => (
              <span key={i}>{tileFor(hintsUsedFor(i))}</span>
            ))}
          </div>
          <div className="stats">
            <div className="stat">
              <b>{correctCount}/{clueState.length}</b>
              <span>helyes tipp nélkül</span>
            </div>
            <div className="stat">
              <b>{progress.streak}</b>
              <span>napos sorozat</span>
            </div>
            <div className="stat">
              <b>{progress.best}</b>
              <span>legjobb sorozat</span>
            </div>
            {puzzle.parHints != null && (
              <div className="stat">
                <b>{puzzle.parHints}</b>
                <span>nehézség (ennyi tipp kell hozzá)</span>
              </div>
            )}
            {avgHints !== null && (
              <div className="stat">
                <b>{avgHints.toFixed(1)}</b>
                <span>átlag tipp / játékos</span>
              </div>
            )}
          </div>
          {puzzle.parHints != null && (
            <div className="feedback hint" style={{ marginLeft: 0, display: 'inline-block' }}>
              {difficultyText(totalHintsFor(clueState), puzzle.parHints)}
            </div>
          )}
          <div className="actions">
            <button className="primary" onClick={share}>
              Eredmény megosztása
            </button>
          </div>
        </div>
      )}

      <footer className="page-footer">
        Új rejtvény minden nap éjfélkor. Elakadtál egy trükkös rejtvényfajtánál? Nézd meg a Súgót.
      </footer>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
