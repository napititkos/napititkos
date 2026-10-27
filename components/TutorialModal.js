'use client';
import { Fragment, useEffect, useState } from 'react';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount, basicsUnlocked } from '../lib/tutorial';
import { loadProgress, saveProgress } from '../lib/progress';
import { computeNewAchievements, ACHIEVEMENTS } from '../lib/achievements';
import Icon from './Icon';
import BetujatekExample from './BetujatekExample';
import SzojatekExample from './SzojatekExample';
import JokerExample from './JokerExample';
import KezdetekExample from './KezdetekExample';

// A tutorial külön oldalra költözött (/tutorial). A régi "open-tutorial" esemény (pl. régebbi
// linkekből) mostantól oda navigál, így a meglévő hívások továbbra is működnek.
export default function TutorialModal() {
  useEffect(() => {
    function handleOpen() {
      window.location.assign('/tutorial');
    }
    window.addEventListener('open-tutorial', handleOpen);
    return () => window.removeEventListener('open-tutorial', handleOpen);
  }, []);
  return null;
}

export function TutorialContent() {
  const [progress, setProgress] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [newAchievementToast, setNewAchievementToast] = useState('');

  useEffect(() => {
    const p = loadTutorialProgress();
    setProgress(p);
    // Aki még nem végezte el a Kezdeteket, annak az nyílik meg elsőként.
    if (!basicsUnlocked(p)) setExpandedSection('kezdetek');
  }, []);

  function handleTutorialProgress(newTutorialProgress) {
    setProgress(newTutorialProgress);
    if (completedSectionsCount(newTutorialProgress) === TUTORIAL_SECTIONS.length) {
      const mainProgress = loadProgress();
      if (!mainProgress.tutorialDone) {
        mainProgress.tutorialDone = true;
        const { unlocked, newly } = computeNewAchievements(
          {
            totalSolved: mainProgress.totalSolved || 0,
            streak: mainProgress.streak,
            fastestTime: mainProgress.fastestTime,
            noHintSolves: mainProgress.noHintSolves || 0,
            submittedPuzzle: mainProgress.submittedPuzzle || false,
            readHelp: mainProgress.readHelp || false,
            tutorialDone: true,
            sharedResult: mainProgress.sharedResult || false,
          },
          mainProgress.unlocked
        );
        mainProgress.unlocked = unlocked;
        saveProgress(mainProgress);
        if (newly.includes('tutorial_done')) {
          const title = ACHIEVEMENTS.find((a) => a.id === 'tutorial_done')?.title;
          window.dispatchEvent(new CustomEvent('achievements-unlocked', { detail: ['tutorial_done'] }));
        }
      }
    }
  }

  if (!progress) return null;
  const allDone = completedSectionsCount(progress) === TUTORIAL_SECTIONS.length;

  return (
    <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TUTORIAL_SECTIONS.map((s) => {
            const done = progress[s.id] || 0;
            const pct = Math.round((done / s.totalTasks) * 100);
            const hasExample = ['kezdetek', 'betujatek', 'szojatek', 'joker'].includes(s.id);
            const locked = s.id !== 'kezdetek' && !basicsUnlocked(progress);
            const isExpanded = expandedSection === s.id;
            return (
              <Fragment key={s.id}>
              <div className={`tutorial-tile${isExpanded ? ' open' : ''}${locked ? ' locked' : ''}`}>
                {/* Az egész csempe (cím, számláló, haladásjelző) egy gomb: ki-be nyitja a példát. */}
                <button
                  type="button"
                  className="tutorial-tile-head"
                  aria-expanded={isExpanded}
                  disabled={!hasExample || locked}
                  onClick={() => hasExample && !locked && setExpandedSection(isExpanded ? null : s.id)}
                >
                  <span className="tutorial-tile-row">
                    <b>
                      <Icon src={s.icon} size={18} /> {s.title}
                    </b>
                    <span className="tutorial-tile-count">
                      {done}/{s.totalTasks}
                    </span>
                  </span>
                  <span className="tutorial-tile-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  {locked ? null : hasExample ? (
                    !isExpanded && <span className="tutorial-tile-cta">{s.id === 'kezdetek' ? 'Kattints ide a kezdéshez →' : 'Kattints ide a példáért →'}</span>
                  ) : (
                    <span className="tutorial-tile-cta muted">Hamarosan érkezik.</span>
                  )}
                </button>
                {hasExample && isExpanded && (
                  <div className="tutorial-tile-body">
                    {s.id === 'kezdetek' ? (
                      <KezdetekExample onProgress={handleTutorialProgress} />
                    ) : s.id === 'betujatek' ? (
                      <BetujatekExample onProgress={handleTutorialProgress} />
                    ) : s.id === 'szojatek' ? (
                      <SzojatekExample onProgress={handleTutorialProgress} />
                    ) : (
                      <JokerExample onProgress={handleTutorialProgress} />
                    )}
                  </div>
                )}
              </div>
              {s.id === 'kezdetek' && !basicsUnlocked(progress) && (
                <p className="tutorial-locked-note">Végezd el a kezdeteket, hogy ezekkel játszhass!</p>
              )}
              </Fragment>
            );
          })}
        </div>
        {allDone && (
          <div className="feedback good tutorial-done" style={{ marginLeft: 0, marginTop: 16 }}>
            <b>Gratulálunk, végigcsináltad a tutorialt!</b> Most már készen állsz a napi
            titkosírásra. Ha még gyakorolnál, a{' '}
            <a href="/archive" style={{ color: 'inherit', fontWeight: 800 }}>Korábbi titkosírások</a>{' '}
            menüpontban kipróbálhatod az összes eddigi rejtvényt.
          </div>
        )}
        {newAchievementToast && (
          <div className="feedback good" style={{ marginLeft: 0, marginTop: 12 }}>
            {newAchievementToast}
          </div>
        )}
    </div>
  );
}
