'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress, saveProgress } from '../lib/progress';
import { computeNewAchievements } from '../lib/achievements';

// Utólagos trófea-ellenőrzés oldalbetöltéskor (munkamenetenként egyszer): a helyben tárolt
// haladásból (megfejtések, legjobb sorozat) és bejelentkezve a szerveren nyilvántartott tényekből
// (közösségi megfejtés, napi titkosírásba került rejtvény) megadja a már teljesített, de még meg
// nem kapott trófeákat, és beúsztatja őket.
export default function AchievementCheck() {
  const { status } = useSession();
  useEffect(() => {
    if (status === 'loading') return;
    const flag = `ach-check-${status}`;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, '1');
    } catch {}
    (async () => {
      let facts = {};
      if (status === 'authenticated') {
        facts = await fetch('/api/achievements/facts', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({}));
      }
      const prog = loadProgress();
      const { unlocked, newly } = computeNewAchievements(
        {
          totalSolved: prog.totalSolved || 0,
          streak: prog.streak || 0,
          best: prog.best || 0,
          fastestTime: prog.fastestTime,
          noHintSolves: prog.noHintSolves || 0,
          submittedPuzzle: prog.submittedPuzzle || false,
          readHelp: prog.readHelp || false,
          tutorialDone: prog.tutorialDone || false,
          sharedResult: prog.sharedResult || false,
          usedAllHints: prog.usedAllHints || false,
          communitySolved: !!facts.communitySolved,
          bigLeagues: !!facts.bigLeagues,
        },
        prog.unlocked
      );
      if (newly.length) {
        prog.unlocked = unlocked;
        saveProgress(prog);
        window.dispatchEvent(new CustomEvent('achievements-unlocked', { detail: newly }));
      }
    })();
  }, [status]);
  return null;
}
