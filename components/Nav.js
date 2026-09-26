'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';
import Icon from './Icon';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(0);
  const { data: session, status } = useSession();

  useEffect(() => {
    setTutorialDone(completedSectionsCount(loadTutorialProgress()));
  }, []);

  async function handleLogout(e) {
    e.preventDefault();
    setOpen(false);
    await signOut({ callbackUrl: '/' });
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
        <div style={{ marginLeft: 'auto' }}>
          {status !== 'loading' && (
            session?.user ? (
              <a href="/account" className="account-badge" title="Profilom">
                <Icon src="/icons/Fiok.png" size={16} />
                <span className="account-badge-label">Profil</span>
              </a>
            ) : (
              <a href="/login" className="account-badge" title="Bejelentkezés">
                <Icon src="/icons/Fiok.png" size={16} />
                <span className="account-badge-label">Belépés</span>
              </a>
            )
          )}
        </div>
      </nav>

      {open && <div className="drawer-overlay" onClick={() => setOpen(false)} />}
      <div className={`drawer-panel ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="brand">Titkos<span>írás</span></div>
          <button className="ghost small" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="drawer-links">
          <a href="/" onClick={() => setOpen(false)}>
            <Icon src="/icons/Kezdolap.png" /> Kezdőlap
          </a>
          <a href="/archive" onClick={() => setOpen(false)}>
            <Icon src="/icons/Korabbi_titkosirasok.png" /> Korábbi titkosírások
          </a>
          <a href="/help" onClick={() => setOpen(false)}>
            <Icon src="/icons/Sugo.png" /> Súgó
          </a>
          <a href="#" onClick={handleTutorialClick} className="tutorial-link">
            <Icon src="/icons/Tutorial.png" /> Tutorial{' '}
            <span className="progress-badge">{tutorialDone}/{TUTORIAL_SECTIONS.length}</span>
          </a>
          <a href="/stats" onClick={() => setOpen(false)}>
            <Icon src="/icons/Statisztikaim.png" /> Statisztikáim
          </a>
          <a href="#" onClick={handleAchievementsClick}>
            <Icon src="/icons/Trofeak.png" /> Trófeák
          </a>
          <a href="/submit" onClick={() => setOpen(false)}>
            <Icon src="/icons/Rejtveny_bekuldese.png" /> Rejtvény beküldése
          </a>
          {session?.user?.role === 'admin' && (
            <a href="/admin" onClick={() => setOpen(false)}>🛠️ Admin</a>
          )}
          <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0' }} />
          <a href="/contact" onClick={() => setOpen(false)}>
            <Icon src="/icons/Kapcsolat.png" /> Kapcsolat
          </a>
          <a href="/privacy" onClick={() => setOpen(false)}>
            <Icon src="/icons/Adatvedelem.png" /> Adatvédelem
          </a>
          <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0' }} />
          {status !== 'loading' && (
            session?.user ? (
              <>
                <div style={{ padding: '10px 10px 2px', fontSize: 13, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon src="/icons/Fiok.png" size={16} />
                  Bejelentkezve: <b style={{ color: 'var(--ink)' }}>{session.user.name || session.user.email}</b>
                </div>
                <a href="#" onClick={handleLogout}>
                  <Icon src="/icons/Kijelentkezes.png" /> Kijelentkezés
                </a>
              </>
            ) : (
              <a href="/login" onClick={() => setOpen(false)}>
                <Icon src="/icons/Fiok.png" /> Bejelentkezés
              </a>
            )
          )}
        </div>
      </div>
    </>
  );
}
