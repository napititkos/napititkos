// A napi játékok fejléce a rács fölött (a titkosírás „Napi titkosírás #N” címének méretében):
//   nehézséggel (szókereső, sudoku): fent balra a cím és a sorszám, jobbra a dátum;
//                                    lent balra a nehézség, jobbra az időmérő (buborékokban)
//   nehézség nélkül (Heti Mini):     fent a cím és a sorszám; lent balra a dátum, jobbra az időmérő
// lead: a nehézség sorának bal szélén megjelenő elem (pl. a sudoku 6×6 / 9×9 váltója).
export default function GameHead({ title, number, level, dateLabel, time, lead = null }) {
  const titleEl = (
    <span className="gh-title puzzle-title">
      {title}
      {number > 0 && <span className="gh-no"> #{number}</span>}
    </span>
  );
  if (!level)
    return (
      <div className="game-head">
        <div className="gh-row">{titleEl}</div>
        <div className="gh-row">
          <span className="szo-date">{dateLabel}</span>
          <span className="timer">{time}</span>
        </div>
      </div>
    );
  return (
    <div className="game-head">
      <div className="gh-row">
        {titleEl}
        <span className="szo-date">{dateLabel}</span>
      </div>
      <div className="gh-row">
        <span className="gh-left">
          {lead}
          <span className="pill gh-level" aria-label={`Nehézség: ${level}/5`}>
            Nehézség: {level}/5
          </span>
        </span>
        <span className="timer">{time}</span>
      </div>
    </div>
  );
}
