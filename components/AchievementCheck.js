'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress, saveProgress } from '../lib/progress';
import { computeNewAchievements, statsFromProgress } from '../lib/achievements';
import { loadTutorialProgress } from '../lib/tutorial';

// Utólagos trófea-ellenőrzés oldalbetöltéskor (munkamenetenként egyszer): a helyben tárolt
// haladásból (megfejtések, legjobb sorozat) és bejelentkezve a szerveren nyilvántartott tényekből
// (közösségi megfejtés, napi titkosírásba került rejtvény) megadja a már teljesített, de még meg
// nem kapott trófeákat, és beúsztatja őket.
async function runCheck(status) {
  let facts = {};
  if (status === 'authenticated') {
    facts = await fetch('/api/achievements/facts', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  const prog = loadProgress();
  // A Kisokos bevezetőjét (Kezdetek) a trófea bevezetése előtt teljesítők is megkapják.
  if (!prog.introDone && (loadTutorialProgress().kezdetek || 0) >= 1) prog.introDone = true;
  const { unlocked, newly } = computeNewAchievements(statsFromProgress(prog, facts), prog.unlocked);
  if (newly.length) {
    prog.unlocked = unlocked;
    saveProgress(prog);
    window.dispatchEvent(new CustomEvent('achievements-unlocked', { detail: newly }));
  }
}

// Utólagos trófea-ellenőrzés oldalbetöltéskor (munkamenetenként egyszer), és bármikor, ha egy
// oldal "achievements-recheck" eseményt küld (pl. közösségi vagy korábbi titkosírás megfejtése után).
export default function AchievementCheck() {
  const { status } = useSession();
  useEffect(() => {
    if (status === 'loading') return;
    const again = () => runCheck(status);
    window.addEventListener('achievements-recheck', again);
    const flag = `ach-check-${status}`;
    let first = true;
    try {
      if (sessionStorage.getItem(flag)) first = false;
      else sessionStorage.setItem(flag, '1');
    } catch {}
    if (first) runCheck(status);
    return () => window.removeEventListener('achievements-recheck', again);
  }, [status]);
  return null;
}
