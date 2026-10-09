'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';
import Icon from './Icon';
import Logo from './Logo';

// Fejléc-változatok kipróbálásra: A = nagyobb, középre igazított felirat, tőle balra a logó; B = középre
// igazított, csupa nagybetűs TITKOSÍRÁS, ahol az O betű a logó. Váltás: ?fejlec=a vagy ?fejlec=b
// (az eszköz megjegyzi). C = mint a B, de másfélszer nagyobb, a fejléc közepére igazított O-logóval;
// D = TITKOS [logó] ÍRÁS, a logó a fejléc közepén. ?fejlec=c / ?fejlec=d. A döntés után a többi törölhető.
const HEADER_VARIANTS = ['a', 'b', 'c', 'd'];
function readHeaderVariant() {
  try {
    const q = new URLSearchParams(window.location.search).get('fejlec');
    if (q && HEADER_VARIANTS.includes(q.toLowerCase())) {
      localStorage.setItem('fejlec-valtozat', q.toLowerCase());
      return q.toLowerCase();
    }
    const saved = localStorage.getItem('fejlec-valtozat');
    return HEADER_VARIANTS.includes(saved) ? saved : 'a';
  } catch {
    return 'a';
  }
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(0);
  const [variant, setVariant] = useState('a');
  const { data: session, status } = useSession();
  // Bejelentkezés után ugyanarra az oldalra térjen vissza, ahonnan indult.
  const pathname = usePathname() || '/';
  const loginHref = pathname === '/' || pathname.startsWith('/login') ? '/login' : `/login?callbackUrl=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    setTutorialDone(completedSectionsCount(loadTutorialProgress()));
    setVariant(readHeaderVariant());
  }, []);

  async function handleLogout(e) {
    e.preventDefault();
    setOpen(false);
    await signOut({ callbackUrl: '/' });
  }

  // (A tutorial már külön oldal, a menü közvetlenül oda linkel; ez a kezelő a régi,
  // eseményalapú megnyitáshoz maradt meg.)
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
      <nav className={`topnav topnav-${variant}`}>
        <button
          className="hamburger-btn"
          aria-label="Menü megnyitása"
          onClick={() => setOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        {variant === 'c' ? (
          <a href="/" className="brand-link" aria-label="Titkosírás - kezdőlap">
            <div className="brand brand-mid brand-c" aria-hidden="true">
              <span className="bm-left">TITK</span>
              <span className="brand-o"><Logo size={null} className="brand-o-logo" /></span>
              <span className="bm-right">S<span>ÍRÁS</span></span>
            </div>
          </a>
        ) : variant === 'd' ? (
          <a href="/" className="brand-link" aria-label="Titkosírás - kezdőlap">
            <div className="brand brand-mid brand-d" aria-hidden="true">
              <span className="bm-left">TITKOS</span>
              <Logo size={null} className="brand-d-logo" />
              <span className="bm-right"><span>ÍRÁS</span></span>
            </div>
          </a>
        ) : variant === 'b' ? (
          <a href="/" className="brand-link" aria-label="Titkosírás - kezdőlap">
            <div className="brand brand-b" aria-hidden="true">
              TITK<span className="brand-o"><Logo size={null} className="brand-o-logo" /></span>S<span>ÍRÁS</span>
            </div>
          </a>
        ) : (
          <a href="/" className="brand-link" aria-label="Titkosírás - kezdőlap">
            <div className="brand brand-a" aria-hidden="true">
              <Logo size={null} className="brand-a-logo" />
              Titkos<span>írás</span>
            </div>
          </a>
        )}
        <div className="topnav-account">
          {status !== 'loading' && (
            session?.user ? (
              <a href="/account" className="account-badge" title="Profilom" aria-label="Profilom">
                <Icon src="/icons/Fiok.png" size={18} />
              </a>
            ) : (
              <a href={loginHref} className="account-badge" title="Bejelentkezés" aria-label="Bejelentkezés">
                <Icon src="/icons/Fiok.png" size={18} />
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
          <a href="/tutorial" onClick={() => setOpen(false)} className="tutorial-link">
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
                <a href="/account" onClick={() => setOpen(false)} title="Profilom" style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>
                  <Icon src="/icons/Fiok.png" size={16} />
                  Bejelentkezve: <b style={{ color: 'var(--ink)' }}>{session.user.name || session.user.email}</b>
                </a>
                <a href="#" onClick={handleLogout}>
                  <Icon src="/icons/Kijelentkezes.png" /> Kijelentkezés
                </a>
              </>
            ) : (
              <a href={loginHref} onClick={() => setOpen(false)}>
                <Icon src="/icons/Fiok.png" /> Bejelentkezés
              </a>
            )
          )}
        </div>
      </div>
    </>
  );
}
