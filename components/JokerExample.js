'use client';
import TutorialSection from './TutorialSection';

// A Kisokos "Joker" szakasza (a feladatok: lib/tutorialPuzzles.js).
export default function JokerExample({ progress, onProgress }) {
  return <TutorialSection sec="joker" progress={progress} onProgress={onProgress} />;
}
