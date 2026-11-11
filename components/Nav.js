'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { TUTORIAL_SECTIONS, loadTutorialProgress, completedSectionsCount } from '../lib/tutorial';
import Icon from './Icon';
import Logo from './Logo';
import { KisokosWordmark, KorabbiWordmark, KozossegiWordmark, MiniWordmark, NapiWordmark, ProfilWordmark, SudokuWordmark, SzoWordmark, TitkosWordmark } from './Wordmark';

const BRAND_LABEL = { titkos: 'Titkosírás', szo: 'Szókereső', mini: 'Heti Mini', napi: 'napititkos.hu – kezdőlap', kisokos: 'Kisokos', korabbi: 'Korábbi rejtvények', profil: 'Profil', kozossegi: 'Közösségi rejtvények', sudoku: 'Sudoku' };


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
  // Az új játékok élesítve vannak: alapból igaz, így oldalváltáskor nem villan fel a régi felirat.
  const [miniLive, setMiniLive] = useState(true);
  useEffect(() => {
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
  // A fül (?tab=mini / ?tab=szo) az aloldalakon is meghatározza, melyik játékhoz tartozunk.
  const [tabGame, setTabGame] = useState(null);
  // Amíg a ?tab= paramétert nem olvastuk ki, az aloldalakon a felirat helye üresen (de lefoglalva)
  // marad, így nem villan fel egy másik játék neve.
  const [tabRead, setTabRead] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        const t = new URLSearchParams(window.location.search).get('tab');
        setTabGame(['mini', 'szo', 'sudoku'].includes(t) ? t : null);
      } catch {}
      setTabRead(true);
    };
    read();
    const onTab = (e) => setTabGame(['mini', 'szo', 'sudoku'].includes(e.detail) ? e.detail : null);
    window.addEventListener('rejtveny-tab', onTab);
    return () => window.removeEventListener('rejtveny-tab', onTab);
  }, [pathname]);
  const GAME_PATHS = { '/titkosiras': 'titkos', '/szokereso': 'szo', '/mini': 'mini', '/sudoku': 'sudoku' };
  const onGame = GAME_PATHS[pathname];
  const game = onGame || (pathname.startsWith('/szokereso') ? 'szo' : pathname.startsWith('/mini') ? 'mini' : tabGame || 'titkos');
  const variant = pathname === '/' && miniLive ? 'napi' : pathname.startsWith('/kisokos') && miniLive ? 'kisokos' : pathname.startsWith('/archive') && miniLive ? 'korabbi' : pathname.startsWith('/account') && miniLive ? 'profil' : pathname === '/kozossegi' && miniLive ? 'kozossegi' : miniLive ? game : 'titkos';
  const brandHref = !miniLive ? '/' : onGame || pathname === '/' ? '/' : { titkos: '/titkosiras', szo: '/szokereso', mini: '/mini', sudoku: '/sudoku' }[game];
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
        {/* A játékok oldalán a felirat a főoldalra visz, máshol (Kisokos, archívum, közösségi stb.)
            a játékhoz, amelyikhez az oldal (vagy a kiválasztott fül) tartozik. */}
        <a href={brandHref} className={`brand-link${['titkos', 'kisokos', 'profil', 'mini', 'kozossegi', 'sudoku'].includes(variant) ? '' : ' brand-link-flow'}${variant === 'napi' ? ' brand-link-napi' : ''}${!onGame && pathname !== '/' && !pathname.startsWith('/kisokos') && !pathname.startsWith('/archive') && !pathname.startsWith('/account') && pathname !== '/kozossegi' && !tabRead ? ' brand-pending' : ''}`} aria-label={BRAND_LABEL[variant]}>
          {variant === 'titkos' ? <TitkosWordmark /> : variant === 'szo' ? <SzoWordmark /> : variant === 'mini' ? <MiniWordmark /> : variant === 'kisokos' ? <KisokosWordmark /> : variant === 'korabbi' ? <KorabbiWordmark /> : variant === 'profil' ? <ProfilWordmark /> : variant === 'kozossegi' ? <KozossegiWordmark /> : variant === 'sudoku' ? <SudokuWordmark /> : <NapiWordmark />}
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
