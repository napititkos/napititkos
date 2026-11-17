'use client';
import { useEffect, useRef, useState } from 'react';
import { ACHIEVEMENTS, achievementProgress, gameOf, statsFromProgress } from '../lib/achievements';

const GAME_LABEL = { titkos: 'Titkosírás', szo: 'Szókereső', mini: 'Heti Mini', sudoku: 'Sudoku' };
// Csoportcímek: az „Összes” nézetben legfelül az általános (minden játékra szóló) trófeák.
const GROUP_LABEL = { altalanos: 'Általános', ...GAME_LABEL };
import { loadProgress } from '../lib/progress';
import Icon from './Icon';
import FramedModal, { GAME_HREF } from './FramedModal';

export default function AchievementsModal() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState([]);
  const [progress, setProgress] = useState({});
  // A játékonkénti szűrő csak a mini/szókereső élesítése után látszik; addig csak a titkosírás trófeái.
  const [filter, setFilter] = useState('all');
  const [multi, setMulti] = useState(false);
  // Melyik játék oldaláról nyitották (a Játszom gombhoz, ha az „Összes” van kiválasztva).
  const [from, setFrom] = useState('titkos');
  const bodyRef = useRef(null);
  const [jump, setJump] = useState(null);
  // Megnyitáskor (és ha a Mini állapota megjön) az aktuális játék csoportja a keret tetejére kerül.
  useEffect(() => {
    if (!open || !jump || !multi) return;
    const box = bodyRef.current;
    const el = box?.querySelector(`[data-game="${jump}"]`);
    if (box && el) box.scrollTop = el.offsetTop;
  }, [open, jump, multi, filter]);

  useEffect(() => {
    function handleOpen(e) {
      // A szűrő mindig „Összes”; játékoldalról a lista az aktuális játék csoportjáig görget.
      setFilter('all');
      setJump(GAME_LABEL[e?.detail?.game] ? e.detail.game : null);
      setFrom(GAME_LABEL[e?.detail?.game] ? e.detail.game : 'titkos');
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

  const close = () => setOpen(false);
  const games = multi ? (filter === 'all' ? ['altalanos', 'titkos', 'szo', 'sudoku', 'mini'] : [filter]) : ['titkos'];
  const shown = ACHIEVEMENTS.filter((a) => games.includes(gameOf(a)));
  const got = shown.filter((a) => unlocked.includes(a.id)).length;
  return (
    <FramedModal
      ref={bodyRef}
      labelId="ach-title"
      bodyLabel="Trófeák listája"
      onClose={close}
      playHref={GAME_HREF[filter === 'all' || filter === 'altalanos' ? from : filter]}
      title={
        <>
          <Icon src="/icons/Trofeak.png" size={24} /> Trófeák
          <span className="ach-progress fm-count" aria-label={`${got} / ${shown.length} megszerezve`}>
            {got}/{shown.length}
          </span>
        </>
      }
      head={
        /* Szűrő: Összes (alapból, játékonként csoportosítva) / Titkosírás / Szókereső / Sudoku / Mini. */
        multi && (
          <label className="ach-filter">
            <span>Játék:</span>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setJump(null);
                if (bodyRef.current) bodyRef.current.scrollTop = 0;
              }}
              aria-label="Trófeák játék szerint"
            >
              {[['all', 'Összes'], ['altalanos', 'Általános'], ['titkos', 'Titkosírás'], ['szo', 'Szókereső'], ['sudoku', 'Sudoku'], ['mini', 'Heti Mini']].map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )
      }
    >
        {games.map((g) => (
          <div key={g} className="ach-group" data-game={g}>
            {multi && filter === 'all' && <h3 className="ach-group-title">{GROUP_LABEL[g]}</h3>}
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
                  {/* Saját beküldéses trófeák: ceruza gomb a beküldéshez. */}
                  {a.link && (
                    <a className="ach-link" href={a.link} aria-label={`${a.title}: ${a.linkLabel || 'ugrás a beküldéshez'}`} title={a.linkLabel || 'Beküldés'}>
                      {a.linkIcon ? (
                        <Icon src={a.linkIcon} size={17} className="icon-on-accent" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 20l1-4.2L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19 4 20z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </a>
                  )}
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
    </FramedModal>
  );
}
