'use client';
import { useEffect, useState } from 'react';
import { ACHIEVEMENTS, achievementProgress, gameOf, statsFromProgress } from '../lib/achievements';

const GAME_LABEL = { titkos: 'Titkosírás', szo: 'Szókereső', mini: 'Heti Mini', sudoku: 'Sudoku' };
import { loadProgress } from '../lib/progress';
import Icon from './Icon';

export default function AchievementsModal() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState([]);
  const [progress, setProgress] = useState({});
  // A játékonkénti szűrő csak a mini/szókereső élesítése után látszik; addig csak a titkosírás trófeái.
  const [filter, setFilter] = useState('all');
  const [multi, setMulti] = useState(false);

  useEffect(() => {
    function handleOpen() {
      setFilter('all');
      fetch('/api/mini/status')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setMulti(!!d?.live))
        .catch(() => {});
      const prog = loadProgress();
      setUnlocked(prog.unlocked || []);
      setProgress(achievementProgress(statsFromProgress(prog)));
      setOpen(true);
      // Bejelentkezve a közösségi megfejtések számát a szerver adja (a számlálóhoz).
      fetch('/api/achievements/facts', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((facts) => facts && setProgress(achievementProgress(statsFromProgress(loadProgress(), facts))))
        .catch(() => {});
    }
    window.addEventListener('open-achievements', handleOpen);
    return () => window.removeEventListener('open-achievements', handleOpen);
  }, []);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Mobilon jobbra fent is van bezárás gomb (görgetéskor is látszik). */}
        <button type="button" className="modal-x" aria-label="Bezárás" onClick={() => setOpen(false)}>
          ×
        </button>
        <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em' }}>
          <Icon src="/icons/Trofeak.png" size={24} /> Trófeák
        </h2>
        {/* Szűrő: Összes (alapból, játékonként csoportosítva) / Titkosírás / Szókereső / Mini. */}
        {multi && (
          <div className="rejtveny-tabs" role="tablist" aria-label="Játék szerint">
            {[['all', 'Összes'], ['titkos', 'Titkosírás'], ['szo', 'Szókereső'], ['mini', 'Mini'], ['sudoku', 'Sudoku']].map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={filter === v} className={filter === v ? 'primary small' : 'ghost small'} onClick={() => setFilter(v)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {(multi ? (filter === 'all' ? ['titkos', 'szo', 'mini', 'sudoku'] : [filter]) : ['titkos']).map((g) => (
          <div key={g} className="ach-group">
            {multi && filter === 'all' && <h3 className="ach-group-title">{GAME_LABEL[g]}</h3>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACHIEVEMENTS.filter((a) => gameOf(a) === g).map((a) => {
            const done = unlocked.includes(a.id);
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: done ? 'var(--accent-soft)' : 'transparent',
                    border: done ? '2px solid transparent' : '2px dashed var(--line)',
                    borderRadius: 12,
                    padding: '8px 10px',
                  }}
                >
                  <span style={{ fontSize: 22, opacity: done ? 1 : 0.35, filter: done ? 'none' : 'grayscale(1)' }} aria-hidden="true">
                    {a.emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: done ? 'var(--ink)' : 'var(--ink-soft)' }}>
                      {a.title}
                      {!done && <span className="sr-only"> (még nincs meg)</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{a.desc}</div>
                  </div>
                  {/* A még meg nem szerzett, számszerű trófeáknál a haladás (pl. 37/50). */}
                  {!done && progress[a.id] && (
                    <span className="ach-progress" aria-label={`Haladás: ${Math.min(progress[a.id][0], progress[a.id][1])} / ${progress[a.id][1]}`}>
                      {Math.min(progress[a.id][0], progress[a.id][1])}/{progress[a.id][1]}
                    </span>
                  )}
                </div>
              );
                })}
            </div>
          </div>
        ))}
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="primary" onClick={() => setOpen(false)}>
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}
