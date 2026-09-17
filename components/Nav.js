'use client';
import { useState } from 'react';

export default function Nav() {
  const [open, setOpen] = useState(false);

  function handleArchiveClick(e) {
    e.preventDefault();
    setOpen(false);
    alert('Hamarosan érkezik! Dolgozunk rajta. 🚧');
  }
  function handleTutorialClick(e) {
    e.preventDefault();
    setOpen(false);
    alert('Építés alatt! Hamarosan érkezik a tutorial. 🚧');
  }
  function handleAchievementsClick(e) {
    e.preventDefault();
    setOpen(false);
    window.dispatchEvent(new Event('open-achievements'));
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
          <a href="#" onClick={handleTutorialClick} className="drawer-link-disabled">
            ✨ Tutorial <span className="soon-badge">Hamarosan!</span>
          </a>
          <a href="#" onClick={handleAchievementsClick}>🏆 Trófeák</a>
          <a href="/submit" onClick={() => setOpen(false)}>✉️ Rejtvény beküldése</a>
          <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0' }} />
          <a href="/contact" onClick={() => setOpen(false)}>📬 Kapcsolat</a>
          <a href="/privacy" onClick={() => setOpen(false)}>🔒 Adatvédelem</a>
        </div>
      </div>
    </>
  );
}
