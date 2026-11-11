// A szokásos „Főoldal” gomb (mint a játékok gombsorában), pl. a profil oldalán.
export default function HomePill({ className = '' }) {
  return (
    <a className={`pill quick-pill back-pill ${className}`.trim()} href="/">
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="quick-ico">
        <path d="M2 7.5 8 2.5l6 5M3.5 6.5V13h3.5V9.5h2V13h3.5V6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>{' '}
      Főoldal
    </a>
  );
}
