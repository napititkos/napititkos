'use client';
import TutorialSection from './TutorialSection';

// A Kisokos "Szojatek" szakasza (a feladatok: lib/tutorialPuzzles.js).
export default function SzojatekExample({ onProgress }) {
  return <TutorialSection sec="szojatek" onProgress={onProgress} />;
}
