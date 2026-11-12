// Kis „megfejtve” jelölés (a főoldali jelölődobozhoz hasonló, csak kisebb): lekerekített fekete
// négyzet, benne lila pipa. A listák jobb szélén, függőlegesen középre igazítva.
export default function SolvedMark({ title = 'Megfejtetted' }) {
  return (
    <span className="solved-mark" role="img" aria-label={title} title={title}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.2 12.6l3.7 3.7 7.9-8.4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
