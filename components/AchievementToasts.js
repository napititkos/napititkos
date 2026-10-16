'use client';
import { useEffect, useRef, useState } from 'react';
import { ACHIEVEMENTS } from '../lib/achievements';

// Új trófea értesítése: jobbra lent beúszó, egyforma szélességű kártyák (ikon + cím), amelyek
// 10 másodperc után eltűnnek. Ha egyszerre több trófea nyílik meg, gyorsan egymás után jönnek,
// egymás alá rendeződnek, a legfrissebb mindig alul. Bárhonnan indítható:
//   window.dispatchEvent(new CustomEvent('achievements-unlocked', { detail: ['id1', 'id2'] }))
const SHOW_MS = 10000;
const STAGGER_MS = 350;

export default function AchievementToasts() {
  const [items, setItems] = useState([]);
  const timers = useRef([]);

  useEffect(() => {
    let seq = 0;
    function onUnlock(e) {
      const ids = Array.isArray(e.detail) ? e.detail : [];
      const found = ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
      found.forEach((a, i) => {
        const key = `${a.id}-${Date.now()}-${seq++}`;
        timers.current.push(
          setTimeout(() => {
            setItems((prev) => [...prev, { key, emoji: a.emoji, title: a.title }]);
            timers.current.push(setTimeout(() => setItems((prev) => prev.filter((x) => x.key !== key)), SHOW_MS));
          }, i * STAGGER_MS)
        );
      });
    }
    window.addEventListener('achievements-unlocked', onUnlock);
    return () => {
      window.removeEventListener('achievements-unlocked', onUnlock);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="ach-toasts" role="status" aria-live="polite">
      {items.map((it) => (
        <div className="ach-toast" key={it.key}>
          <span className="ach-toast-icon" aria-hidden="true">{it.emoji}</span>
          <span className="ach-toast-text">
            <span className="ach-toast-label">Új trófea</span>
            <b>{it.title}</b>
          </span>
        </div>
      ))}
    </div>
  );
}
