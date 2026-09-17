'use client';
import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../lib/achievements';
import { loadProgress } from '../lib/progress';

export default function AchievementsModal() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState([]);

  useEffect(() => {
    function handleOpen() {
      const prog = loadProgress();
      setUnlocked(prog.unlocked || []);
      setOpen(true);
    }
    window.addEventListener('open-achievements', handleOpen);
    return () => window.removeEventListener('open-achievements', handleOpen);
  }, []);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--accent)', marginTop: 0, letterSpacing: '0.015em' }}>
          🏆 Trófeák
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACHIEVEMENTS.map((a) => {
            const done = unlocked.includes(a.id);
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  opacity: done ? 1 : 0.4,
                  background: done ? 'var(--accent-soft)' : 'transparent',
                  borderRadius: 12,
                  padding: '8px 10px',
                }}
              >
                <span style={{ fontSize: 22 }}>{a.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="primary" onClick={() => setOpen(false)}>
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}
