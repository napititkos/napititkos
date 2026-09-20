'use client';
import { useEffect, useState } from 'react';
import { TUTORIAL_SECTIONS, loadTutorialProgress } from '../lib/tutorial';
import Icon from './Icon';

export default function TutorialModal() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    function handleOpen() {
      setProgress(loadTutorialProgress());
      setOpen(true);
    }
    window.addEventListener('open-tutorial', handleOpen);
    return () => window.removeEventListener('open-tutorial', handleOpen);
  }, []);

  if (!open || !progress) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--accent)', marginTop: 0, letterSpacing: '0.015em' }}>
          <Icon src="/icons/Tutorial.png" size={24} /> Tutorial
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: -6 }}>
          Három rész segít felkészülni a kriptikus rejtvényekre. A tartalom hamarosan érkezik -
          a haladásod (vendégként is) itt fog megjelenni.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TUTORIAL_SECTIONS.map((s) => {
            const done = progress[s.id] || 0;
            const pct = Math.round((done / s.totalTasks) * 100);
            return (
              <div key={s.id} style={{ border: '2px solid var(--line)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>
                    {s.emoji} {s.title}
                  </b>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    {done}/{s.totalTasks}
                  </span>
                </div>
                <div style={{ background: 'var(--line)', borderRadius: 999, height: 8, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--accent)', height: '100%', width: `${pct}%`, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>Hamarosan érkezik.</div>
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
