'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';
import Icon from './Icon';
import Logo from './Logo';
import { MiniIcon } from './GameIcons';


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
  // A fejléc logója a játék szerint: élesítés után a főoldalon NAPITITKOS, a szókeresőben
  // SZÓKERESŐ (a kos az Ó helyén), máshol TITKOSÍRÁS. Az élesítés állapotát az eszköz megjegyzi,
  // hogy oldalváltáskor ne villanjon a régi logó.
  const [miniLive, setMiniLive] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('mini-live') === '1') setMiniLive(true);
    } catch {}
    fetch('/api/mini/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = !!d?.live;
        setMiniLive(v);
        try {
          localStorage.setItem('mini-live', v ? '1' : '0');
        } catch {}
      })
      .catch(() => {});
  }, []);
  const variant = pathname.startsWith('/szokereso') ? 'szo' : pathname.startsWith('/mini') && miniLive ? 'mini' : pathname === '/' && miniLive ? 'napi' : 'titkos';
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
        {variant === 'titkos' ? (
          <a href={miniLive ? '/titkosiras' : '/'} className="brand-link" aria-label="Titkosírás">
            <div className="brand brand-mid brand-c" aria-hidden="true">
              <span className="bm-left">TITK</span>
              <span className="brand-o"><Logo size={null} className="brand-o-logo" /></span>
              <span className="bm-right">S<span>ÍRÁS</span></span>
            </div>
          </a>
        ) : variant === 'mini' ? (
          <a href="/mini" className="brand-link brand-link-flow" aria-label="Mini keresztrejtvény">
            <div className="brand brand-flow brand-mini" aria-hidden="true">
              <MiniIcon size={null} />
              <span className="bf-accent">MINI</span>
            </div>
          </a>
        ) : variant === 'szo' ? (
          <a href="/szokereso" className="brand-link brand-link-flow" aria-label="Szókereső">
            <div className="brand brand-flow brand-c" aria-hidden="true">
              <span className="bf-ink">SZ</span>
              <span className="brand-o"><Logo size={null} className="brand-o-logo" /></span>
              <span className="bf-accent">KERESŐ</span>
            </div>
          </a>
        ) : (
          <a href="/" className="brand-link brand-link-flow" aria-label="Napititkos – kezdőlap">
            <div className="brand brand-flow brand-c" aria-hidden="true">
              <span className="bf-accent">NAPI</span>
              <span className="bf-ink">TITK</span>
              <span className="brand-o"><Logo size={null} className="brand-o-logo" /></span>
              <span className="bf-ink">S</span>
            </div>
          </a>
        )}
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
