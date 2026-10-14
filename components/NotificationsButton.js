'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const SEEN_KEY = 'titkositas_notifications_seen_v1';
// A személyes értesítések külön "látott" jelzője: új személyes értesítésnél a doboz magától
// lenyílik (egyszer), a mindenkinek szóló értesítéseknél csak a pötty jelez, mint eddig.
const PERSONAL_SEEN_KEY = 'titkositas_personal_notifications_seen_v1';

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
  // A doboz megnyitásakor érvényes "utoljára látott" időpont: az ennél újabb értesítések
  // mellett piros pont jelzi, hogy újak (ugyanolyan, mint a csengő gombon).
  const [newSince, setNewSince] = useState(Infinity);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  // A doboz nyúlványa pontosan a csengő gomb közepére mutat (a gomb tényleges szélessége alapján).
  const [arrowRight, setArrowRight] = useState(10);
  const popRef = useRef(null);
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return;
    // A nyúlvány (24 px széles SVG) közepe a gomb közepére essen; a "right" a doboz belső
    // (keret nélküli) jobb szélétől mérődik, a keret 2 px.
    // (A transzformációtól - a kinyílás animációjától - független méretekből számolva.)
    const wrapWidth = wrapRef.current ? wrapRef.current.clientWidth : 0;
    const btnCenter = btnRef.current.offsetLeft + btnRef.current.offsetWidth / 2;
    setArrowRight(Math.round(wrapWidth - 2 - btnCenter - 12));
  }, [open]);

  useEffect(() => {
    try {
      setSeenTs(Number(localStorage.getItem(SEEN_KEY)) || 0);
    } catch {}
    // A mindenkinek szóló és (bejelentkezve) a személyes értesítések együtt, időrendben.
    const all = fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => d.notifications || [])
      .catch(() => []);
    const mine = fetch('/api/notifications/mine', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => (d.notifications || []).map((n) => ({ ...n, personal: true })))
      .catch(() => []);
    Promise.all([all, mine]).then(([a, m]) => {
      const merged = [...m, ...a].sort((x, y) => (y.ts || 0) - (x.ts || 0)).slice(0, 25);
      setItems(merged);
      const newestPersonal = m.reduce((mx, n) => Math.max(mx, n.ts || 0), 0);
      let personalSeen = 0;
      try {
        personalSeen = Number(localStorage.getItem(PERSONAL_SEEN_KEY)) || 0;
      } catch {}
      if (newestPersonal > personalSeen) {
        // Új személyes értesítés: első megjelenéskor nyitva mutatjuk; mellé kattintva bezárul.
        const newest = merged[0]?.ts || 0;
        let prevSeen = 0;
        try {
          prevSeen = Number(localStorage.getItem(SEEN_KEY)) || 0;
        } catch {}
        setNewSince(prevSeen);
        setOpen(true);
        setSeenTs(newest);
        try {
          localStorage.setItem(PERSONAL_SEEN_KEY, String(newestPersonal));
          localStorage.setItem(SEEN_KEY, String(newest));
        } catch {}
      }
    });
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
    if (next) setNewSince(seenTs);
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
        ref={btnRef}
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
        <div className="notif-pop" ref={popRef} role="dialog" aria-label="Értesítések">
          {/* Lekerekített nyúlvány: a doboz kerete folytatólagosan fut fel a csúcsba és vissza
              (a kitöltés eltakarja alatta a doboz keretének egyenes szakaszát). */}
          <svg className="notif-arrow" style={{ right: arrowRight }} width="24" height="13" viewBox="0 0 24 13" aria-hidden="true">
            <path className="notif-arrow-fill" d="M0 13 L0 12 C5 12 7.5 9.5 9.5 5.5 Q12 0.5 14.5 5.5 C16.5 9.5 19 12 24 12 L24 13 Z" />
            <path className="notif-arrow-line" d="M0 12 C5 12 7.5 9.5 9.5 5.5 Q12 0.5 14.5 5.5 C16.5 9.5 19 12 24 12" />
          </svg>
          {/* A görgetés a belső részen van, hogy a nyúlványt a doboz széle ne vágja le. */}
          <div className="notif-scroll">
          {items.length === 0 ? (
            <div className="notif-empty">Nincs értesítés.</div>
          ) : (
            items.map((n) => (
              <div className={`notif-item${n.personal ? ' personal' : ''}`} key={n.id}>
                <div className="notif-time">
                  {(n.ts || 0) > newSince && <span className="notif-new-dot" aria-label="új" role="img" />}
                  {formatTs(n.ts)}
                  {n.personal ? ' · neked szól' : ''}
                </div>
                <div className="notif-text">
                  {n.text}
                  {n.href && (
                    <>
                      {' '}
                      <a href={n.href} className="notif-link">Megnézem →</a>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      )}
    </div>
  );
}
