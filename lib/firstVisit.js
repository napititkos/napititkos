'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress, saveProgress } from './progress';

// Az „Üdv a …-ban!” ablak csak az első alkalommal jöjjön fel. Megjegyezzük az eszközön és – a
// haladás részeként – a fiókban is, így bejelentkezve másik eszközön sem jön fel újra. Bejelentkezve
// megvárjuk, amíg a fiók haladása megérkezik, mielőtt döntünk. Aki már játszott az adott játékkal,
// annak sem jön fel.
//   key: 'titkos' | 'szo' | 'sudoku'
const LOCAL = { titkos: 'titkositas_intro_seen', szo: 'szo_intro_seen', sudoku: 'sudoku_intro_seen' };
const played = (prog, key) =>
  key === 'szo' ? (prog.szoWords || 0) > 0 : key === 'sudoku' ? (prog.sudokuDays || []).length > 0 : Object.keys(prog.history || {}).length > 0;
const seen = (key) => {
  try {
    if (localStorage.getItem(LOCAL[key])) return true;
  } catch {}
  const prog = loadProgress();
  return !!prog.introsSeen?.[key] || (key === 'titkos' && !!prog.introDone) || played(prog, key);
};

export function useFirstVisit(key) {
  const { status } = useSession();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (status === 'loading') return;
    if (seen(key)) return;
    if (status !== 'authenticated') return setShow(true);
    // Bejelentkezve: a fiók haladásának megérkezése után döntünk (legfeljebb 3 mp várakozás).
    let done = false;
    const decide = () => {
      if (done) return;
      done = true;
      if (!seen(key)) setShow(true);
    };
    window.addEventListener('progress-synced', decide);
    const t = setTimeout(decide, 3000);
    return () => {
      window.removeEventListener('progress-synced', decide);
      clearTimeout(t);
    };
  }, [status, key]);
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(LOCAL[key], '1');
    } catch {}
    const prog = loadProgress();
    prog.introsSeen = { ...(prog.introsSeen || {}), [key]: true };
    saveProgress(prog);
  };
  return [show, dismiss];
}
