'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { fireConfetti } from '../components/Confetti';
import { ACHIEVEMENTS, computeNewAchievements } from '../lib/achievements';
import { loadProgress, saveProgress, dropGuestEntry } from '../lib/progress';
import { loadActiveMs, saveActiveMs, clearActiveTimer } from '../lib/activeTimer';
import { loadInProgress, saveInProgress, clearInProgress } from '../lib/inProgress';
import { deviceId } from '../lib/device';
import { getIdentity } from '../lib/identity';
import { previousDay } from '../lib/date';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import LetterBoxes from '../components/LetterBoxes';
import PlayActions from '../components/PlayActions';
import ClueText from '../components/ClueText';
import { HL_TYPES, highlightMap } from '../lib/clue';
import { enumerationFor } from '../lib/format';
import Comments from '../components/Comments';
import NotificationsButton from '../components/NotificationsButton';

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


export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [puzzleMeta, setPuzzleMeta] = useState(null);
  const [guess, setGuess] = useState([]);
  const [lockedLetters, setLockedLetters] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [betuCount, setBetuCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  // Megfejtés után a betűmező fókusza megszűnik, így a mobil billentyűzet bezárul (nyitva
  // maradva a billentyűzet a megváltozott oldal egy részét takarhatta).
  useEffect(() => {
    if (answered && document.activeElement?.classList?.contains('letter-box')) document.activeElement.blur();
  }, [answered]);
  const [correct, setCorrect] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Aktív játékidő: accRef = eddig felgyűlt idő, resumeRef = mikor indult az aktuális
  // (látható) szakasz; ha az oldal a háttérben van, resumeRef = null és az idő áll.
  const accRef = useRef(0);
  const resumeRef = useRef(null);
  const [timerReady, setTimerReady] = useState(false);
  const loadStartedRef = useRef(false);
  const [playingCount, setPlayingCount] = useState(null);
  const activeElapsed = () => accRef.current + (resumeRef.current ? Date.now() - resumeRef.current : 0);
  const [progress, setProgress] = useState({ streak: 0, best: 0 });
  const [avgHints, setAvgHints] = useState(null);
  const [solverCount, setSolverCount] = useState(null);
  const [toast, setToast] = useState('');
  const [showIntro, setShowIntro] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [countdown, setCountdown] = useState('');
  const timerRef = useRef(null);
  const finishedRef = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsSeen, setCommentsSeen] = useState(false);
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
    // Megvárjuk, amíg kiderül, be van-e jelentkezve (a vendégként megfejtett mai
    // titkosírást bejelentkezés után újra meg lehessen fejteni a fiókkal).
    if (sessionStatus === 'loading' || loadStartedRef.current) return;
    loadStartedRef.current = true;
    // A nap első kérése végzi a napi váltást; reggel (hidegindításkor) ez lassabb lehet,
    // és a szerver átmenetileg "foglalt" (503) vagy hálózati hibát adhat. Ilyenkor csendben
    // újrapróbáljuk, és csak több sikertelen kísérlet után mutatunk hibát.
    async function fetchPuzzle() {
      const delays = [0, 700, 1500, 3000, 5000];
      let last = null;
      for (const d of delays) {
        if (d) await new Promise((r) => setTimeout(r, d));
        try {
          const r = await fetch('/api/puzzle', { cache: 'no-store' });
          const data = await r.json().catch(() => null);
          if (r.ok && data && !data.error) return data;
          if (data?.error === 'no-puzzles') return data; // végleges: nincs rejtvény
          last = data || { error: `http-${r.status}` };
        } catch (err) {
          last = { error: 'network' };
        }
      }
      throw last;
    }
    fetchPuzzle()
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
        let reopened = false;
        if (sessionStatus === 'authenticated' && dropGuestEntry(prog, data.date)) {
          saveProgress(prog);
          clearActiveTimer();
          clearInProgress();
          reopened = true;
        }
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
        } else {
          // Az időzítő onnan folytatódik, ahol abbahagyta (frissítés, bezárás után is),
          // de csak a látható percek számítanak.
          // Félbehagyott játék (felhasznált tippek, felfedett betűk, beírt válasz) visszatöltése.
          const ip = loadInProgress(data.date, data.puzzle.answer);
          if (ip) {
            setGuess(ip.guess);
            setLockedLetters(ip.lockedLetters);
            setRevealed(ip.revealed);
            setBetuCount(ip.betuCount);
          }
          accRef.current = loadActiveMs(data.date);
          resumeRef.current = document.visibilityState === 'visible' ? Date.now() : null;
          setElapsed(activeElapsed());
          setTimerReady(true);
          // "Még fejti" számláló: névtelen eszközazonosítóval jelezzük, hogy megnyitotta.
          const dev = deviceId();
          if (dev) {
            fetch('/api/stats/presence', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ device: dev, action: reopened ? 'reopen' : 'open' }),
            }).catch(() => {});
          }
        }
        fetchStats(data.date);
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Nem sikerült betölteni a mai titkosírást. Próbáld frissíteni az oldalt.');
        setLoading(false);
      });
  }, [sessionStatus]);

  useEffect(() => {
    if (loading || answered || !puzzle || !timerReady) return;
    const date = puzzleMeta?.date;
    const persist = () => date && !finishedRef.current && saveActiveMs(date, activeElapsed());
    let ticks = 0;
    timerRef.current = setInterval(() => {
      setElapsed(activeElapsed());
      if (++ticks % 4 === 0) persist(); // kb. 2 másodpercenként mentjük (összeomlás esetére is)
    }, 500);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!resumeRef.current) resumeRef.current = Date.now();
      } else {
        accRef.current = activeElapsed();
        resumeRef.current = null;
        persist();
      }
      setElapsed(activeElapsed());
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', persist);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, [loading, answered, puzzle, timerReady]);

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
    // Szinkron (nem React state) őr a duplán induló hívások ellen - pl. ha valaki
    // gyorsan kétszer nyomja meg az Ellenőrzés gombot vagy Entert, mielőtt az
    // "answered" állapot ténylegesen frissülne. Enélkül a statisztikába (megfejtők
    // száma) duplán kerülhetne be ugyanaz a megoldás, míg a ranglistán nem (ott ez
    // védett), ami eltérést okozott a két szám között.
    if (finishedRef.current) return;
    finishedRef.current = true;

    const finalGuess = guessOverride || guess;
    const finalLocked = lockedOverride || lockedLetters;
    const finalElapsed = activeElapsed();
    accRef.current = finalElapsed;
    resumeRef.current = null;
    setElapsed(finalElapsed);
    clearInterval(timerRef.current);
    clearActiveTimer();
    clearInProgress();
    fireConfetti();

    const totalHints = revealed.filter((t) => t !== 'betu').length + betuCount + (didGiveUp ? 1 : 0);

    const prog = loadProgress();
    const today = puzzleMeta.date;
    // Pillanatkép a megfejtés előtti állapotról: ha vendégként fejti meg, bejelentkezés
    // után ebből állítjuk vissza, hogy a fiókjával újra megfejthesse.
    const undo = {
      streak: prog.streak,
      best: prog.best,
      lastDate: prog.lastDate,
      totalSolved: prog.totalSolved || 0,
      noHintSolves: prog.noHintSolves || 0,
      fastestTime: prog.fastestTime ?? null,
    };
    // Ha ma már vendégként egyszer beleszámított a statisztikába, most ne számoljuk újra.
    const repeat = prog.guestReplayDate === today;
    // A szerver (budapesti) dátumából számoljuk az előző napot, nem a böngésző UTC idejéből.
    const yesterday = previousDay(today);
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
      ...(session?.user ? {} : { guest: true, undo }),
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

    // A statisztikát csak a küldés befejezése után kérjük le (frissen, a gyorsítótárat
    // megkerülve), különben a saját eredményünk nélkül jelenne meg.
    const statsSent = fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, hintsUsed: totalHints, correct: wasCorrect, repeat }),
    }).catch(() => {});
    const dev = deviceId();
    const presenceSent = dev
      ? fetch('/api/stats/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device: dev, action: 'done' }),
        }).catch(() => {})
      : Promise.resolve();

    if (wasCorrect) {
      // Soha nem tesszük ki az email címet a ranglistára - ha van fiókhoz tartozó
      // név (pl. Google-lal automatikusan kapott), azt használjuk, egyébként
      // ugyanaz a véletlenszerűen generált azonosító jár, mint a vendégeknek.
      const displayName = session?.user?.name || getIdentity().name;
      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, name: displayName, hintsUsed: totalHints, elapsed: finalElapsed }),
      }).catch(() => {});
    }

    Promise.all([statsSent, presenceSent]).then(() => fetchStats(today, true));
  }

  function fetchStats(date, fresh = false) {
    // A böngésző ne mutasson korábban letöltött (régi) számot: mindig friss választ kérünk.
    fetch(`/api/stats?date=${date}${fresh ? `&t=${Date.now()}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setAvgHints(d.average);
        setSolverCount(d.correctCount ?? 0);
        setPlayingCount(typeof d.playing === 'number' ? d.playing : null);
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

  // Játék közben a felhasznált tippek és a beírt válasz mentése (kilépés után is megmarad).
  useEffect(() => {
    if (loading || answered || !puzzle || !puzzleMeta?.date || !timerReady) return;
    saveInProgress(puzzleMeta.date, puzzle.answer, { guess, lockedLetters, revealed, betuCount });
  }, [guess, lockedLetters, revealed, betuCount, loading, answered, puzzle, puzzleMeta?.date, timerReady]);

  // A nyitott eredménykártyán a számok (megfejtők, még fejti) maguktól is frissülnek:
  // 20 másodpercenként, ha az oldal látszik, és azonnal, amikor visszatér a lapra.
  useEffect(() => {
    if (!answered || !puzzleMeta?.date) return;
    const date = puzzleMeta.date;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchStats(date);
    }, 20000);
    const onVisible = () => document.visibilityState === 'visible' && fetchStats(date);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [answered, puzzleMeta?.date]);

  // A kommentek darabszáma zárójelben csak addig látszik, amíg ma még nem nyitotta meg.
  const COMMENTS_SEEN_KEY = 'titkositas_comments_seen_v1';
  useEffect(() => {
    if (!answered || !puzzleMeta?.date) return;
    try {
      setCommentsSeen(localStorage.getItem(COMMENTS_SEEN_KEY) === puzzleMeta.date);
    } catch {}
    fetch(`/api/comments?date=${puzzleMeta.date}&count=1`)
      .then((r) => r.json())
      .then((d) => setCommentCount(d.count || 0))
      .catch(() => {});
  }, [answered, puzzleMeta?.date]);

  function openComments() {
    setShowComments(true);
    setCommentsSeen(true);
    try {
      localStorage.setItem(COMMENTS_SEEN_KEY, puzzleMeta.date);
    } catch {}
  }

  function share() {
    const text = shareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('Eredmény vágólapra másolva!'));
    } else {
      showToast(text);
    }
    const prog = loadProgress();
    if (!prog.sharedResult) {
      prog.sharedResult = true;
      const { unlocked, newly } = computeNewAchievements(
        {
          totalSolved: prog.totalSolved || 0,
          streak: prog.streak,
          fastestTime: prog.fastestTime,
          noHintSolves: prog.noHintSolves || 0,
          submittedPuzzle: prog.submittedPuzzle || false,
          readHelp: prog.readHelp || false,
          tutorialDone: prog.tutorialDone || false,
          sharedResult: true,
        },
        prog.unlocked
      );
      prog.unlocked = unlocked;
      saveProgress(prog);
      setUnlockedAchievements(unlocked);
      setTimeout(() => announceAchievements(newly), 1200);
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
  // Az összes lehetséges tipp: a szöveges tippek + annyi, ahány betű kérhető.
  const hintsTotal =
    availableHints.filter((t) => t !== 'betu').length +
    (availableHints.includes('betu') ? Array.from(puzzle.answer).filter((c) => c !== ' ').length : 0);

  // A felfedett tippekhez (az admin felületen) kijelölt szavak kiemelése a tipp színével;
  // a tipp-ablak bezárása után is megmarad.
  const marks = highlightMap(puzzle.hints, revealed);

  return (
    <div className="wrap" style={{ paddingTop: 10 }}>
      {showIntro && (
        <div className="modal-overlay" onClick={dismissIntro}>
          <div className="modal-card intro-card" onClick={(e) => e.stopPropagation()}>
            {/* A logó a keret felső vonalán ül, középen: a keret körbefut rajta. */}
            <div className="intro-logo">
              <Logo size={84} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em', textAlign: 'center' }}>
              Üdv a Titkosírásban!
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              A Titkosírás a találós kérdések egy különleges formája, ahol a gyakorlott szem
              elsőre lehetetlennek tűnő rejtvényeket is meg tud fejteni.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              Ahhoz, hogy belekezdj, először nézd át a{' '}
              <a href="/help" style={{ color: 'var(--accent-text)', fontWeight: 700 }} onClick={dismissIntro}>
                Súgót
              </a>{' '}
              és a{' '}
              <a
                href="/tutorial"
                style={{ color: 'var(--accent-text)', fontWeight: 700 }}
                onClick={dismissIntro}
              >
                Tutorialt
              </a>{' '}
              – kattints rájuk, vagy bármikor megtalálod őket a menüben is.
            </p>
            <div className="actions" style={{ marginTop: 18 }}>
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
          <Icon src="/icons/Ranglista.png" size={16} /> Ranglista
        </button>
        <span className="pill"><Icon src="/icons/Streak.png" size={15} /> {progress.streak} napos sorozat</span>
        <NotificationsButton />
      </div>

      <div className="card">
        <div className="topbar">
          <div className="topbar-main">
            <div className="puzzle-title">
              Napi titkosírás{puzzleMeta?.dayNumber ? ` #${puzzleMeta.dayNumber}` : ''}
            </div>
            <div className="topbar-sub">
              <span>{puzzleMeta?.date ? formatHuDate(puzzleMeta.date) : 'minden nap új!'}</span>
              {puzzle.submittedBy && <span className="submitted-by">Beküldte: {puzzle.submittedBy}</span>}
            </div>
          </div>
          <div className="timer topbar-timer">{formatTime(elapsed)}</div>
        </div>

        {/* Megfejtés után a doboz alja közvetlenül a visszajelzés alá zárkózik fel. */}
        <div className="clue-row" style={{ borderTop: 'none', paddingTop: 0, paddingBottom: answered ? 0 : undefined }}>
          <div className="clue-box">
            <div className="clue-text">
              <ClueText clue={puzzle.clue} marks={marks} />{' '}
              <span className="clue-enum">{enumerationFor(puzzle.answer)}</span>
            </div>
          </div>

          {!answered && (
            <>
              <div style={{ marginTop: 10 }}>
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
              />
              {revealed.filter((t) => t !== 'betu').map((t) => (
                <div className={`hint-box${HL_TYPES.includes(t) ? ` hl-type-${t}` : ''}`} key={t}>
                  <>
                      {HL_TYPES.includes(t) && <span className="hl-dot" />}
                      <b>{HINT_LABELS[t]}:</b> {puzzle.hints[t].text}
                    </>
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
                <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em' }}>
                  <Icon src="/icons/Rejtveny_tippek.png" size={22} /> Melyik tippet kéred?
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {availableHints.map((t) => {
                    const isBetu = t === 'betu';
                    const used = isBetu ? false : revealed.includes(t);
                    const exhausted = isBetu && noMoreLettersToReveal();
                    const hl = HL_TYPES.includes(t);
                    return (
                      <div
                        key={t}
                        className={hl ? `hl-type-${t}` : undefined}
                        style={{
                          border: `2px solid ${hl ? 'var(--hl-ink)' : 'var(--line)'}`,
                          borderRadius: 12,
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <b>
                            {hl && <span className="hl-dot" />}
                            {HINT_LABELS[t]}
                          </b>
                          <button
                            className={used ? 'ghost small' : `primary small${hl ? ' hl-btn' : ''}`}
                            disabled={used || exhausted}
                            onClick={() => {
                          // Tipp kérésekor az ablak bezárul, hogy azonnal látszódjon a rejtvényben.
                          if (isBetu) revealLetterHint();
                          else revealHint(t);
                          setShowHintModal(false);
                        }}
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
                          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
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
                  A definíció, a mutató és a készlet tipphez tartozó szavakat a rejtvényben a tipp
                  színével jelöljük.
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

        </div>
      </div>

      {answered && (
        <div className="card result">
          <h2>{correct ? 'Nyertél!' : 'Ennyi mára'}</h2>
          <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Idő: {formatTime(elapsed)}</div>
          <div className="result-actions">
            <div className="result-action">
              <button className="primary round-btn" onClick={share} aria-label="Eredmény másolása">
                <Icon src="/icons/Megosztas.png" size={20} className="icon-on-accent" />
              </button>
              <span>Eredmény másolása</span>
            </div>
            <div className="result-action">
              <button className="primary round-btn" onClick={() => setShowExplain(true)} aria-label="Magyarázat">
                <Icon src="/icons/Rejtveny_tippek.png" size={20} className="icon-on-accent" />
              </button>
              <span>Magyarázat</span>
            </div>
            <div className="result-action">
              <button className="primary round-btn" onClick={openComments} aria-label="Kommentek">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.8A8 8 0 1 1 21 12z" />
                </svg>
              </button>
              <span className={!commentsSeen && commentCount > 0 ? 'has-new' : ''}>Kommentek ({commentCount})</span>
            </div>
          </div>
          <div className="stats">
            {solverCount !== null && (
              <div className="stat">
                <b>{solverCount}</b>
                <span>megfejtő ma</span>
              </div>
            )}
            {playingCount !== null && (
              <div className="stat">
                <b>{playingCount}</b>
                <span>még fejti</span>
              </div>
            )}
            {avgHints !== null && (
              <div className="stat">
                <b>{avgHints.toFixed(1)}</b>
                <span>átlag tipp / játékos</span>
              </div>
            )}
          </div>
          {countdown && (
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              <Icon src="/icons/Kovetkezo_rejtveny.png" size={14} /> Következő titkosírás:{' '}
              <b style={{ color: 'var(--accent2-text)', fontVariantNumeric: 'tabular-nums' }}>{countdown}</b>
            </div>
          )}
        </div>
      )}

      {showExplain && (
        <div className="modal-overlay" onClick={() => setShowExplain(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0 }}>
              <Icon src="/icons/Rejtveny_tippek.png" size={22} /> Magyarázat
            </h2>
            <div className="clue-box" style={{ marginBottom: 10 }}>
              <div className="clue-text">
                <ClueText clue={puzzle.clue} marks={highlightMap(puzzle.hints, HL_TYPES)} />{' '}
                <span className="clue-enum">{enumerationFor(puzzle.answer)}</span>
              </div>
            </div>
            <p style={{ margin: '0 0 12px' }}>
              Megfejtés: <b style={{ color: 'var(--accent-text)', letterSpacing: '0.05em' }}>{puzzle.answer}</b>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HINT_ORDER.filter((t) => t !== 'betu' && puzzle.hints?.[t]?.enabled && puzzle.hints[t].text).map((t) => (
                <div key={t} className={`hint-box${HL_TYPES.includes(t) ? ` hl-type-${t}` : ''}`} style={{ marginLeft: 0, marginTop: 0 }}>
                  {HL_TYPES.includes(t) && <span className="hl-dot" />}
                  <b>{HINT_LABELS[t]}:</b> {puzzle.hints[t].text}
                </div>
              ))}
              {!HINT_ORDER.some((t) => t !== 'betu' && puzzle.hints?.[t]?.enabled && puzzle.hints[t].text) && (
                <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Ehhez a titkosíráshoz nem tartozik szöveges tipp.</p>
              )}
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="ghost" onClick={() => setShowExplain(false)}>
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {showComments && (
        <div className="modal-overlay" onClick={() => setShowComments(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0 }}>
              Mai kommentek ({commentCount})
            </h2>
            <Comments date={puzzleMeta.date} onCountChange={setCommentCount} />
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="ghost" onClick={() => setShowComments(false)}>
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="page-footer">
        Új titkosírás minden nap éjfélkor (magyar idő szerint). Elakadtál? Nézd meg a{' '}
        <a href="/help" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>
          Súgót
        </a>
        .
      </footer>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
