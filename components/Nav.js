'use client';
import { useEffect, useState } from 'react';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(0);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    setTutorialDone(completedSectionsCount(loadTutorialProgress()));
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  async function handleLogout(e) {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setOpen(false);
    window.location.href = '/';
  }

  function handleArchiveClick(e) {
    e.preventDefault();
    setOpen(false);
    alert('Hamarosan érkezik! Dolgozunk rajta. 🚧');
  }
  function handleTutorialClick(e) {
    e.preventDefault();
    setOpen(false);
    window.dispatchEvent(new Event('open-tutorial'));
  }
  function handleAchievementsClick(e) {
    e.preventDefault();
    setOpen(false);
    window.dispatchEvent(new Event('open-achievements'));
  }
  function handleLeaderboardClick(e) {
    e.preventDefault();
    setOpen(false);
    window.dispatchEvent(new Event('open-leaderboard'));
  }

  return (
    <>
      <nav className="topnav">
        <button
          className="hamburger-btn"
          aria-label="Menü megnyitása"
          onClick={() => setOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <a href="/" style={{ textDecoration: 'none' }}>
          <div className="brand">Titkos<span>írás</span></div>
        </a>
      </nav>

      {open && <div className="drawer-overlay" onClick={() => setOpen(false)} />}
      <div className={`drawer-panel ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="brand">Titkos<span>írás</span></div>
          <button className="ghost small" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="drawer-links">
          <a href="/" onClick={() => setOpen(false)}>🏠 Kezdőlap</a>
          <a href="/archive" onClick={handleArchiveClick} className="drawer-link-disabled">
            🗂️ Korábbi titkosírások <span className="soon-badge">Hamarosan!</span>
          </a>
          <a href="/help" onClick={() => setOpen(false)}>📖 Súgó</a>
          <a href="#" onClick={handleTutorialClick} className="tutorial-link">
            ✨ Tutorial <span className="progress-badge">{tutorialDone}/{TUTORIAL_SECTIONS.length}</span>
          </a>
          <a href="#" onClick={handleLeaderboardClick}>🏅 Ranglista</a>
          <a href="#" onClick={handleAchievementsClick}>🏆 Trófeák</a>
          <a href="/submit" onClick={() => setOpen(false)}>✉️ Rejtvény beküldése</a>
          <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0' }} />
          <a href="/contact" onClick={() => setOpen(false)}>📬 Kapcsolat</a>
          <a href="/privacy" onClick={() => setOpen(false)}>🔒 Adatvédelem</a>
          <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0' }} />
          {!userLoading && (
            user ? (
              <>
                <div style={{ padding: '10px 10px 2px', fontSize: 13, color: 'var(--ink-soft)' }}>
                  Bejelentkezve: <b style={{ color: 'var(--ink)' }}>{user.name}</b>
                </div>
                <a href="#" onClick={handleLogout}>🚪 Kijelentkezés</a>
              </>
            ) : (
              <a href="/login" onClick={() => setOpen(false)}>🔑 Bejelentkezés</a>
            )
          )}
        </div>
      </div>
    </>
  );
}
