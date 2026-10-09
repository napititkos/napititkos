'use client';
import { useEffect, useState } from 'react';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';
import { loadProgress, saveProgress } from '../lib/progress';
import { computeNewAchievements, ACHIEVEMENTS } from '../lib/achievements';
import Icon from './Icon';
import BetujatekExample from './BetujatekExample';
import SzojatekExample from './SzojatekExample';
import JokerExample from './JokerExample';

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
    setProgress(loadTutorialProgress());
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
          setNewAchievementToast(`🏆 Új trófea: ${title}`);
          setTimeout(() => setNewAchievementToast(''), 3000);
        }
      }
    }
  }

  if (!progress) return null;
  const allDone = completedSectionsCount(progress) === TUTORIAL_SECTIONS.length;

  return (
    <div className="card">
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 0 }}>
          Három rész segít felkészülni a kriptikus rejtvényekre. A haladásod (vendégként is) itt
          fog megjelenni.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TUTORIAL_SECTIONS.map((s) => {
            const done = progress[s.id] || 0;
            const pct = Math.round((done / s.totalTasks) * 100);
            const hasExample = s.id === 'betujatek' || s.id === 'szojatek' || s.id === 'joker';
            const isExpanded = expandedSection === s.id;
            return (
              <div key={s.id} style={{ border: '2px solid var(--line)', borderRadius: 12, padding: '10px 12px' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: hasExample ? 'pointer' : 'default' }}
                  onClick={() => hasExample && setExpandedSection(isExpanded ? null : s.id)}
                >
                  <b>
                    <Icon src={s.icon} size={18} /> {s.title}
                  </b>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    {done}/{s.totalTasks}
                  </span>
                </div>
                <div style={{ background: 'var(--line)', borderRadius: 999, height: 8, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--accent)', height: '100%', width: `${pct}%`, transition: 'width 0.3s ease' }} />
                </div>
                {hasExample ? (
                  isExpanded ? (
                    s.id === 'betujatek' ? (
                      <BetujatekExample onProgress={handleTutorialProgress} />
                    ) : s.id === 'szojatek' ? (
                      <SzojatekExample onProgress={handleTutorialProgress} />
                    ) : (
                      <JokerExample onProgress={handleTutorialProgress} />
                    )
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--accent-text)', marginTop: 6, cursor: 'pointer' }} onClick={() => setExpandedSection(s.id)}>
                      Kattints ide a példáért →
                    </div>
                  )
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>Hamarosan érkezik.</div>
                )}
              </div>
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
