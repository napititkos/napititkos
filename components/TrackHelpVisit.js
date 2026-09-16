'use client';
import { useEffect } from 'react';
import { loadProgress, saveProgress } from '../lib/progress';
import { computeNewAchievements } from '../lib/achievements';

export default function TrackHelpVisit() {
  useEffect(() => {
    const prog = loadProgress();
    if (prog.readHelp) return;
    prog.readHelp = true;
    const { unlocked } = computeNewAchievements(
      {
        totalSolved: prog.totalSolved || 0,
        streak: prog.streak || 0,
        fastestTime: prog.fastestTime,
        submittedPuzzle: prog.submittedPuzzle || false,
        readHelp: true,
      },
      prog.unlocked
    );
    prog.unlocked = unlocked;
    saveProgress(prog);
  }, []);

  return null;
}
