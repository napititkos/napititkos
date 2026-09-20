'use client';
import { useEffect, useRef, useState } from 'react';
import { fireConfetti } from '../components/Confetti';
import { ACHIEVEMENTS, computeNewAchievements } from '../lib/achievements';
import { loadProgress, saveProgress } from '../lib/progress';
import { getIdentity } from '../lib/identity';
import PodiumIcon from '../components/PodiumIcon';

const HINT_LABELS = {
  fodder: 'Készlet',
  indikator: 'Mutató',
  definicio: 'Definíció',
  alternativ: 'Alternatív tipp',
  betu: 'Helyes betű',
};
const HINT_ORDER = ['definicio', 'indikator', 'fodder', 'alternativ', 'betu'];

const norm = (s) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}
function withSuffix(n) {
  return n === 1 ? '1-gyel' : `${n}-vel`;
}
function feedbackText(isCorrect, hintCount, answer) {
  if (isCorrect) {
    return hintCount === 0 ? 'Helyes válasz, tipp nélkül!' : `Helyes válasz (${hintCount} tipp felhasználva)`;
  }
  return `A válasz: ${answer}`;
}
const HU_MONTHS = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
];
function formatHuDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${y}. ${HU_MONTHS[m - 1]} ${d}.`;
}

const HU_WORD_RE = /[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]+/g;
const HU_STOPWORDS = new Set([
  'a', 'az', 'egy', 'és', 'de', 'hogy', 'ha', 'is', 'nem', 'ez', 'ezt', 'ennek',
  'arra', 'vagy', 'mint', 'majd', 'még', 'csak', 'már', 'meg', 'vele', 'lesz',
  'volt', 'ami', 'amit', 'aki', 'akit', 'itt', 'ott', 'nagyon', 'ilyen', 'olyan',
]);
function extractWords(text) {
  return (text || '').match(HU_WORD_RE) || [];
}
// Két szó "ugyanattól a tőtől" származik-e - egyszerű, ragozás-toleráns heurisztika:
// egyezőnek számít, ha az egyik szó a másiknak (kellően hosszú) eleje.
// Ez elkapja pl. "rettenetes" / "rettenetesen" vagy "citrom" / "citromot" párokat is.
function sameStem(a, b) {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 4) return false;
  return longer.startsWith(shorter);
}
// Kísérleti: megkeresi, mely (nem túl gyakori) szavak szerepelnek - akár ragozott
// alakban is - mind a tipp szövegében, mind magában a rejtvényben.
function getHighlightWords(hintText, clueText) {
  const hintWords = extractWords(hintText)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 4 && !HU_STOPWORDS.has(w));
  const clueWordsLower = extractWords(clueText).map((w) => w.toLowerCase());
  const matched = new Set();
  for (const cw of clueWordsLower) {
    if (hintWords.some((hw) => sameStem(hw, cw))) matched.add(cw);
  }
  return Array.from(matched);
}
function renderClueWithHighlight(clueText, highlightWords) {
  if (!highlightWords || highlightWords.length === 0) return clueText;
  const wordsSet = new Set(highlightWords);
  const tokens = (clueText || '').split(new RegExp(`(${HU_WORD_RE.source})`, 'g'));
  return tokens.map((tok, i) =>
    wordsSet.has(tok.toLowerCase()) ? (
      <mark className="clue-highlight" key={i}>
        {tok}
      </mark>
    ) : (
      tok
    )
  );
}
function difficultyText(totalHints, parHints, correct) {
  if (parHints == null) return null;
  if (!correct) return 'Legközelebb sikerülni fog!';
  const diff = totalHints - parHints;
  if (diff === 0) return 'Pontosan a nehézségnek megfelelően oldottad meg!';
  if (diff < 0) return `${withSuffix(Math.abs(diff))} kevesebb tippet használtál, mint a nehézség - szép munka!`;
  return `${withSuffix(diff)} több tippet használtál, mint a nehézség.`;
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
  const [guess, setGuess] = useState([]);
  const [lockedLetters, setLockedLetters] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [betuCount, setBetuCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());
  const [progress, setProgress] = useState({ streak: 0, best: 0 });
  const [avgHints, setAvgHints] = useState(null);
  const [solverCount, setSolverCount] = useState(null);
  const [toast, setToast] = useState('');
  const [showIntro, setShowIntro] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [highlightedHintType, setHighlightedHintType] = useState(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [countdown, setCountdown] = useState('');
  const timerRef = useRef(null);
  const toastTimeout = useRef(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem('titkositas_intro_seen')) {
        setShowIntro(true);
      }
    } catch {}
  }, []);

  function dismissIntro() {
    setShowIntro(false);
    try {
      localStorage.setItem('titkositas_intro_seen', '1');
    } catch {}
  }

  useEffect(() => {
    fetch('/api/puzzle')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg('Még nincs feltöltve egyetlen titkosírás sem. Nézz vissza hamarosan!');
          setLoading(false);
          return;
        }
        setPuzzle(data.puzzle);
        setPuzzleMeta({
          index: data.index,
          total: data.total,
          date: data.date,
          nextRotationAt: data.nextRotationAt,
          dayNumber: data.dayNumber,
        });
        setGuess(emptyGuess(data.puzzle.answer));
        setLockedLetters(emptyLocked(data.puzzle.answer));

        const prog = loadProgress();
        setProgress({ streak: prog.streak, best: prog.best });
        setUnlockedAchievements(prog.unlocked || []);
        const saved = prog.history[data.date];
        if (saved) {
          setGuess(saved.guess);
          setLockedLetters(saved.lockedLetters);
          setRevealed(saved.revealed);
          setBetuCount(saved.betuCount || 0);
          setAnswered(true);
          setCorrect(saved.correct);
          setGaveUp(saved.gaveUp);
          setElapsed(saved.elapsed);
          fetchStats(data.date);
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Nem sikerült betölteni a mai titkosírást. Próbáld frissíteni az oldalt.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading || answered || !puzzle) return;
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), 500);
    return () => clearInterval(timerRef.current);
  }, [loading, answered, puzzle, startTime]);

  useEffect(() => {
    if (!answered || !puzzleMeta?.nextRotationAt) return;
    function tick() {
      const diff = new Date(puzzleMeta.nextRotationAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Bármely pillanatban…');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [answered, puzzleMeta]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(''), 2600);
  }

  function hintsUsed() {
    const otherCount = revealed.filter((t) => t !== 'betu').length;
    return otherCount + betuCount + (gaveUp ? 1 : 0);
  }

  function checkAnswer(value) {
    if (norm(value) === norm(puzzle.answer)) {
      setCorrect(true);
      setAnswered(true);
      finishGame({ correct: true, gaveUp: false });
    } else {
      showToast('Ez még nem az. Próbálj egy tippet, ha elakadtál!');
    }
  }

  function revealHint(type) {
    if (!revealed.includes(type)) {
      setRevealed((prev) => [...prev, type]);
    }
    setHighlightedHintType(type);
  }

  function revealLetterHint() {
    const clue = puzzle;
    const answerChars = Array.from(clue.answer);
    const guessNext = [...guess];
    const locked = [...lockedLetters];
    const candidates = [];
    answerChars.forEach((ch, pos) => {
      if (ch !== ' ' && norm(guessNext[pos]) !== norm(ch)) candidates.push(pos);
    });
    if (candidates.length === 0) return;
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    guessNext[idx] = answerChars[idx].toUpperCase();
    locked[idx] = true;
    setGuess(guessNext);
    setLockedLetters(locked);
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

  function announceAchievements(ids) {
    if (!ids.length) return;
    const titles = ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.title).filter(Boolean);
    if (titles.length) showToast(`🏆 Új trófea: ${titles.join(', ')}`);
  }

  function giveUp() {
    const fullGuess = Array.from(puzzle.answer).map((ch) => (ch === ' ' ? ' ' : ch.toUpperCase()));
    const fullLocked = fullGuess.map(() => true);
    setGuess(fullGuess);
    setLockedLetters(fullLocked);
    setAnswered(true);
    setGaveUp(true);
    setCorrect(false);
    finishGame({ correct: false, gaveUp: true, guessOverride: fullGuess, lockedOverride: fullLocked });
  }

  function finishGame({ correct: wasCorrect, gaveUp: didGiveUp, guessOverride, lockedOverride }) {
    const finalGuess = guessOverride || guess;
    const finalLocked = lockedOverride || lockedLetters;
    const finalElapsed = Date.now() - startTime;
    setElapsed(finalElapsed);
    clearInterval(timerRef.current);
    fireConfetti();

    const totalHints = revealed.filter((t) => t !== 'betu').length + betuCount + (didGiveUp ? 1 : 0);

    const prog = loadProgress();
    const today = puzzleMeta.date;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    if (prog.lastDate === yesterday) prog.streak += 1;
    else if (prog.lastDate !== today) prog.streak = 1;
    prog.best = Math.max(prog.best, prog.streak);
    prog.lastDate = today;
    prog.history[today] = {
      guess: finalGuess,
      lockedLetters: finalLocked,
      revealed,
      betuCount,
      correct: wasCorrect,
      gaveUp: didGiveUp,
      elapsed: finalElapsed,
    };
    if (wasCorrect) {
      prog.totalSolved = (prog.totalSolved || 0) + 1;
      if (totalHints === 0) prog.noHintSolves = (prog.noHintSolves || 0) + 1;
      if (prog.fastestTime == null || finalElapsed < prog.fastestTime) {
        prog.fastestTime = finalElapsed;
      }
    }
    const { unlocked, newly } = computeNewAchievements(
      {
        totalSolved: prog.totalSolved || 0,
        streak: prog.streak,
        fastestTime: prog.fastestTime,
        noHintSolves: prog.noHintSolves || 0,
        submittedPuzzle: prog.submittedPuzzle || false,
        readHelp: prog.readHelp || false,
      },
      prog.unlocked
    );
    prog.unlocked = unlocked;
    saveProgress(prog);
    setProgress({ streak: prog.streak, best: prog.best });
    setUnlockedAchievements(unlocked);
    announceAchievements(newly);

    fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, hintsUsed: totalHints, correct: wasCorrect }),
    }).catch(() => {});

    if (wasCorrect) {
      const identity = getIdentity();
      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, name: identity.name, hintsUsed: totalHints, elapsed: finalElapsed }),
      }).catch(() => {});
    }

    fetchStats(today);
  }

  function fetchStats(date) {
    fetch(`/api/stats?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        setAvgHints(d.average);
        setSolverCount(d.correctCount ?? 0);
      })
      .catch(() => {});
  }

  function shareText() {
    const totalHints = hintsUsed();
    const lines = [
      `Titkosírás · ${puzzleMeta?.date || ''}`,
      `"${puzzle.clue}"`,
      correct ? feedbackText(true, totalHints) : feedbackText(false, 0, puzzle.answer),
      `Idő: ${formatTime(elapsed)}`,
      `Eddigi megfejtők száma ma: ${solverCount ?? 0}`,
      'napititkos.hu',
    ];
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

  const availableHints = HINT_ORDER.filter(
    (t) => t === 'betu' || (puzzle.hints?.[t]?.enabled && puzzle.hints[t].text)
  );

  const activeHighlightWords =
    highlightedHintType && highlightedHintType !== 'betu' && puzzle.hints?.[highlightedHintType]?.text
      ? getHighlightWords(puzzle.hints[highlightedHintType].text, puzzle.clue)
      : [];

  return (
    <div className="wrap">
      {showIntro && (
        <div className="modal-overlay" onClick={dismissIntro}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--accent)', marginTop: 0, letterSpacing: '0.015em' }}>
              Üdv a Titkosírásban! 🔐
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              A Titkosírás a találós kérdések egy különleges formája, ahol a gyakorlott szem
              elsőre lehetetlennek tűnő rejtvényeket is meg tud fejteni.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              Ahhoz, hogy belekezdj, először nézd át a <b>Súgót</b> és a <b>tutorialt</b>{' '}
              (ez utóbbi hamarosan érkezik).
            </p>
            <div className="actions" style={{ marginTop: 18 }}>
              <a href="/help" style={{ textDecoration: 'none' }} onClick={dismissIntro}>
                <button className="ghost">Súgó megnyitása</button>
              </a>
              <button className="primary" onClick={dismissIntro}>
                Értem, kezdjünk neki!
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
        <button
          className="pill"
          style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => window.dispatchEvent(new Event('open-leaderboard'))}
        >
          <PodiumIcon size={16} /> Ranglista
        </button>
        <span className="pill">🔥 {progress.streak} napos sorozat</span>
      </div>

      <div className="card">
        <div className="topbar">
          <div>
            <div className="puzzle-title">
              Napi titkosírás{puzzleMeta?.dayNumber ? ` #${puzzleMeta.dayNumber}` : ''}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>minden nap új!</div>
          </div>
          <div className="timer">{formatTime(elapsed)}</div>
        </div>

        <div className="clue-row" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div className="clue-head">
            <div className="clue-text">
              {renderClueWithHighlight(puzzle.clue, activeHighlightWords)}
            </div>
          </div>
          {puzzle.submittedBy && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
              Beküldte: {puzzle.submittedBy}
            </div>
          )}

          {!answered && (
            <>
              <div className="answer-row">
                <LetterBoxes
                  answer={puzzle.answer}
                  value={guess}
                  locked={lockedLetters}
                  onChange={setGuess}
                  disabled={answered}
                  onEnter={() => checkAnswer(guess.join(''))}
                />
                <button
                  className="ghost small"
                  disabled={!isRowFull()}
                  onClick={shuffleGuess}
                  title="A beírt betűk véletlenszerű összekeverése"
                >
                  🌀 Keverés
                </button>
                <button className="primary" onClick={() => checkAnswer(guess.join(''))}>
                  Ellenőrzés
                </button>
                <button className="ghost small" onClick={giveUp}>
                  Feladom, mutasd a választ
                </button>
              </div>
              {availableHints.length > 0 && (
                <div className="hintbar">
                  <button className="ghost small" onClick={() => setShowHintModal(true)}>
                    💡 Tippek ({hintsUsed()} felhasználva)
                  </button>
                </div>
              )}
              {revealed.map((t) => (
                <div
                  className="hint-box"
                  key={t}
                  style={{
                    cursor: t === 'betu' ? 'default' : 'pointer',
                    outline: highlightedHintType === t ? `2px solid var(--accent)` : 'none',
                  }}
                  onClick={() =>
                    t !== 'betu' && setHighlightedHintType((prev) => (prev === t ? null : t))
                  }
                  title={t !== 'betu' ? 'Kattints: emelje ki (vagy tüntesse el) a rejtvényben a hasonló szót' : undefined}
                >
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

          {showHintModal && (
            <div
              className="modal-overlay hint-modal-overlay"
              onClick={() => setShowHintModal(false)}
            >
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--accent)', marginTop: 0, letterSpacing: '0.015em' }}>
                  💡 Melyik tippet kéred?
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {availableHints.map((t) => {
                    const isBetu = t === 'betu';
                    const used = isBetu ? false : revealed.includes(t);
                    const exhausted = isBetu && noMoreLettersToReveal();
                    const isHighlighted = highlightedHintType === t;
                    return (
                      <div
                        key={t}
                        style={{
                          border: `2px solid ${isHighlighted ? 'var(--accent)' : 'var(--line)'}`,
                          borderRadius: 12,
                          padding: '10px 12px',
                          background: isHighlighted ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <b>{HINT_LABELS[t]}</b>
                          <button
                            className={used ? 'ghost small' : 'primary small'}
                            disabled={used || exhausted}
                            onClick={() => (isBetu ? revealLetterHint() : revealHint(t))}
                          >
                            {isBetu
                              ? exhausted
                                ? 'Nincs több betű'
                                : `Kérek egy betűt (${betuCount} eddig)`
                              : used
                              ? 'Felhasználva ✓'
                              : 'Ezt kérem'}
                          </button>
                        </div>
                        {(isBetu ? betuCount > 0 : used) && (
                          <p
                            style={{
                              fontSize: 13.5,
                              color: 'var(--ink-soft)',
                              margin: '8px 0 0',
                              cursor: isBetu ? 'default' : 'pointer',
                              textDecoration: !isBetu ? 'underline dotted' : 'none',
                            }}
                            onClick={() =>
                              !isBetu && setHighlightedHintType((prev) => (prev === t ? null : t))
                            }
                            title={!isBetu ? 'Kattints: emelje ki a rejtvényben, hol illik ez a szó' : undefined}
                          >
                            {isBetu
                              ? `Eddig ${betuCount} betűt fedtünk fel a válaszban.`
                              : puzzle.hints[t].text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 14 }}>
                  🧪 Kísérleti: amint elkérsz egy tippet, automatikusan megjelöljük a
                  rejtvényben a hozzá kapcsolódó szót. Kattints a tipp szövegére, hogy ki- vagy
                  bekapcsold a kiemelést.
                </p>
                <div className="actions" style={{ marginTop: 10 }}>
                  <button className="primary" onClick={() => setShowHintModal(false)}>
                    Bezárás
                  </button>
                </div>
              </div>
            </div>
          )}

          {answered && (
            <div className="answer-row">
              <LetterBoxes
                answer={puzzle.answer}
                value={guess}
                locked={lockedLetters}
                onChange={() => {}}
                disabled={true}
              />
            </div>
          )}

          {answered && (
            <div className={`feedback ${correct ? 'good' : 'hint'}`}>
              {correct ? `✓ ${feedbackText(true, hintsUsed())}` : feedbackText(false, 0, puzzle.answer)}
            </div>
          )}

          {puzzleMeta?.date && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 12, marginLeft: 8 }}>
              📅 {formatHuDate(puzzleMeta.date)}
            </div>
          )}
        </div>
      </div>

      {answered && (
        <div className="card result">
          <h2>{correct ? 'Nyertél!' : 'Ennyi mára'}</h2>
          <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Idő: {formatTime(elapsed)}</div>
          <div className="stats">
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
            {solverCount !== null && (
              <div className="stat">
                <b>{solverCount}</b>
                <span>megfejtő ma</span>
              </div>
            )}
          </div>
          {puzzle.parHints != null && (
            <div className="feedback hint" style={{ marginLeft: 0, display: 'inline-block' }}>
              {difficultyText(hintsUsed(), puzzle.parHints, correct)}
            </div>
          )}
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="primary" onClick={share} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, lineHeight: 1.2 }}>
              <span style={{ fontSize: 20 }}>📤</span>
              <span>Eredmény másolása</span>
            </button>
          </div>
          {countdown && (
            <div style={{ marginTop: 18, fontSize: 13.5, color: 'var(--ink-soft)' }}>
              ⏳ Következő titkosírás:{' '}
              <b style={{ color: 'var(--accent2)', fontVariantNumeric: 'tabular-nums' }}>{countdown}</b>
            </div>
          )}
        </div>
      )}

      <footer className="page-footer">
        Új titkosírás minden nap éjfélkor (magyar idő szerint). Elakadtál? Nézd meg a{' '}
        <a href="/help" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          Súgót
        </a>
        .
      </footer>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
