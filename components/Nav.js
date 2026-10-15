'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';
import Icon from './Icon';
import Logo from './Logo';


export default function Nav() {
  const [open, setOpen] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(0);
  const { data: session, status } = useSession();
  // Az admin gomb láthatóságát egy osztály (html.nav-admin) vezérli: az oldal betöltésekor egy
  // apró szkript (app/layout.js) már az első megjelenés előtt beállítja az utoljára ismert
  // állapotból, így oldalváltáskor nem villan fel; a munkamenet betöltése után frissül.
  const isAdmin = session?.user?.role === 'admin';
  useEffect(() => {
    if (status === 'loading') return;
    try {
      localStorage.setItem('nav-admin', isAdmin ? '1' : '0');
    } catch {}
    document.documentElement.classList.toggle('nav-admin', isAdmin);
  }, [status, isAdmin]);
  // Bejelentkezés után ugyanarra az oldalra térjen vissza, ahonnan indult.
  const pathname = usePathname() || '/';
  const loginHref = pathname === '/' || pathname.startsWith('/login') ? '/login' : `/login?callbackUrl=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    setTutorialDone(completedSectionsCount(loadTutorialProgress()));
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
      {/* Fejléc: a hamburger menü megszűnt. Balra a profil gomb, középen a TITKOSÍRÁS felirat a
          logóval, jobbra (adminnak) az admin felület gombja. */}
      <nav className="topnav topnav-c">
        {/* A profil gomb mindig látszik (betöltés közben is), így oldalváltáskor nem villan fel:
            amíg a bejelentkezés állapota nem ismert, a Profilom oldalra mutat (az vendégnek a
            bejelentkezést kínálja). */}
        <div className="topnav-account">
          {session?.user || status === 'loading' ? (
            <a href="/account" className="account-badge" title="Profilom" aria-label="Profilom">
              <Icon src="/icons/Fiok.png" size={18} />
            </a>
          ) : (
            <a href={loginHref} className="account-badge" title="Bejelentkezés" aria-label="Bejelentkezés">
              <Icon src="/icons/Fiok.png" size={18} />
            </a>
          )}
        </div>
        <a href="/" className="brand-link" aria-label="Titkosírás - kezdőlap">
          <div className="brand brand-mid brand-c" aria-hidden="true">
            <span className="bm-left">TITK</span>
            <span className="brand-o"><Logo size={null} className="brand-o-logo" /></span>
            <span className="bm-right">S<span>ÍRÁS</span></span>
          </div>
        </a>
        {/* Jobb oldalon adminnak az admin felület gombja (egyébként üres hely, hogy a felirat
            pontosan középen maradjon). */}
        <div className="topnav-right">
          <a href="/admin" className="account-badge admin-badge" title="Admin felület" aria-label="Admin felület">
            <span aria-hidden="true">🛠️</span>
          </a>
        </div>
      </nav>
    </>
  );
}
