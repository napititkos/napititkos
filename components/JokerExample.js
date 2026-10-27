'use client';
import TutorialSection from './TutorialSection';

// A Kisokos "Joker" szakasza (a feladatok: lib/tutorialPuzzles.js).
export default function JokerExample({ onProgress }) {
  return <TutorialSection sec="joker" onProgress={onProgress} />;
}
