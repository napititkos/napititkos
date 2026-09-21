'use client';
import { useEffect, useState } from 'react';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';
import { loadProgress, saveProgress } from '../lib/progress';
import { computeNewAchievements, ACHIEVEMENTS } from '../lib/achievements';
import Icon from './Icon';
import BetujatekExample from './BetujatekExample';
import SzojatekExample from './SzojatekExample';
import JokerExample from './JokerExample';

export default function TutorialModal() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [newAchievementToast, setNewAchievementToast] = useState('');

  useEffect(() => {
    function handleOpen() {
      setProgress(loadTutorialProgress());
      setOpen(true);
    }
    window.addEventListener('open-tutorial', handleOpen);
    return () => window.removeEventListener('open-tutorial', handleOpen);
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

  if (!open || !progress) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Baloo 2, sans-serif', color: 'var(--accent)', marginTop: 0, letterSpacing: '0.015em' }}>
          <Icon src="/icons/Tutorial.png" size={24} /> Tutorial
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: -6 }}>
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
                    <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, cursor: 'pointer' }} onClick={() => setExpandedSection(s.id)}>
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
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="primary" onClick={() => setOpen(false)}>
            Bezárás
          </button>
        </div>
        {newAchievementToast && (
          <div className="feedback good" style={{ marginLeft: 0, marginTop: 12 }}>
            {newAchievementToast}
          </div>
        )}
      </div>
    </div>
  );
}
