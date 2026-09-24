'use client';
import { useEffect, useState } from 'react';

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

// Csak akkor jelenik meg, ha van értesítés. Új (még nem látott) értesítésnél pont jelzi.
export default function NotificationsButton() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [seenTs, setSeenTs] = useState(0);

  useEffect(() => {
    try {
      setSeenTs(Number(localStorage.getItem(SEEN_KEY)) || 0);
    } catch {}
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setItems(d.notifications || []))
      .catch(() => {});
  }, []);

  if (!items.length) return null;
  const newest = items[0].ts || 0;
  const hasNew = newest > seenTs;

  function openModal() {
    setOpen(true);
    setSeenTs(newest);
    try {
      localStorage.setItem(SEEN_KEY, String(newest));
    } catch {}
  }

  return (
    <>
      <button
        className={`pill notif-btn${hasNew ? ' has-new' : ''}`}
        style={{ border: 'none', cursor: 'pointer' }}
        onClick={openModal}
        aria-label={hasNew ? 'Értesítések (új)' : 'Értesítések'}
        title="Értesítések"
      >
        <BellIcon size={17} />
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent)', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BellIcon size={24} /> Értesítések
            </h2>
            <div className="comment-list">
              {items.map((n) => (
                <div className="comment" key={n.id}>
                  <div className="comment-head">
                    <span>{formatTs(n.ts)}</span>
                  </div>
                  <div className="comment-text">{n.text}</div>
                </div>
              ))}
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="primary" onClick={() => setOpen(false)}>
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
