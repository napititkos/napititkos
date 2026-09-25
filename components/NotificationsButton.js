'use client';
import { useEffect, useRef, useState } from 'react';

const SEEN_KEY = 'titkositas_notifications_seen_v1';

function formatTs(ts) {
  try {
    return new Date(ts).toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function BellIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" />
      <path d="M8.2 15.2h7.6l-.9-1.3V11a2.9 2.9 0 0 0-5.8 0v2.9l-.9 1.3z" />
      <path d="M11 17.1a1.1 1.1 0 0 0 2 0" />
    </svg>
  );
}

// Mindig látszik (a sorozat mellett). Olvasatlan értesítésnél pont jelzi; kattintásra a
// gombról lelógó doboz nyílik, ami mellé kattintva (vagy Esc-re) bezárul.
export default function NotificationsButton() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [seenTs, setSeenTs] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    try {
      setSeenTs(Number(localStorage.getItem(SEEN_KEY)) || 0);
    } catch {}
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setItems(d.notifications || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const newest = items[0]?.ts || 0;
  const hasNew = newest > seenTs;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && newest) {
      setSeenTs(newest);
      try {
        localStorage.setItem(SEEN_KEY, String(newest));
      } catch {}
    }
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        className={`pill notif-btn${hasNew ? ' has-new' : ''}`}
        style={{ border: 'none', cursor: 'pointer' }}
        onClick={toggle}
        aria-expanded={open}
        aria-label={hasNew ? 'Értesítések (új)' : 'Értesítések'}
        title="Értesítések"
      >
        <BellIcon size={17} />
      </button>
      {open && (
        <div className="notif-pop" role="dialog" aria-label="Értesítések">
          {items.length === 0 ? (
            <div className="notif-empty">Nincs értesítés.</div>
          ) : (
            items.map((n) => (
              <div className="notif-item" key={n.id}>
                <div className="notif-time">{formatTs(n.ts)}</div>
                <div className="notif-text">{n.text}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
