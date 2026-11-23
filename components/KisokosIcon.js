// A Kisokos jele: vastag, lekerekített kérdőjel (a korábbi kirakós ikon helyett). Az aktuális
// szövegszínt veszi fel, így világos, sötét módban és a mályva gombokon is jól látszik.
export default function KisokosIcon({ size = 15, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`kisokos-ico ${className}`.trim()}>
      <path d="M8.2 8.6a3.9 3.9 0 1 1 5.6 3.5c-1.1.55-1.8 1.35-1.8 2.6v.6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="19.6" r="1.9" fill="currentColor" />
    </svg>
  );
}
