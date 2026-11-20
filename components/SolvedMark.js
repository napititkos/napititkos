// Kis „megfejtve” jelölés (a főoldali jelölődobozhoz hasonló, csak kisebb): lekerekített fekete
// négyzet, benne lila pipa. A listák jobb szélén, függőlegesen középre igazítva. done={false}: üres
// doboz (még nincs megfejtve).
export default function SolvedMark({ done = true, title }) {
  const label = title || (done ? 'Megfejtetted' : 'Még nincs megfejtve');
  return (
    <span className={`solved-mark${done ? '' : ' empty'}`} role="img" aria-label={label} title={label}>
      {done && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.2 12.6l3.7 3.7 7.9-8.4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
