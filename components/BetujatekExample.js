'use client';
import TutorialSection from './TutorialSection';

// A Kisokos "Betujatek" szakasza (a feladatok: lib/tutorialPuzzles.js).
export default function BetujatekExample({ progress, onProgress }) {
  return <TutorialSection sec="betujatek" progress={progress} onProgress={onProgress} />;
}
