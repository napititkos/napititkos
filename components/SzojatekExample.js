'use client';
import TutorialSection from './TutorialSection';

// A Kisokos "Szojatek" szakasza (a feladatok: lib/tutorialPuzzles.js).
export default function SzojatekExample({ progress, onProgress }) {
  return <TutorialSection sec="szojatek" progress={progress} onProgress={onProgress} />;
}
