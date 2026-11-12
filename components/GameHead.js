// A napi játékok (szókereső, sudoku) fejléce a rács fölött:
//   balra fent: „Napi szókereső #12” · jobbra fent: nehézség buborékban
//   balra lent: a dátum · jobbra lent: az időmérő buborékban
export default function GameHead({ title, number, level, dateLabel, time }) {
  return (
    <div className="game-head">
      <div className="gh-row">
        <span className="gh-title">
          {title}
          {number > 0 && <span className="szo-dayno"> #{number}</span>}
        </span>
        {level ? (
          <span className="pill gh-level" aria-label={`Nehézség: ${level}/5`}>
            Nehézség: {level}/5
          </span>
        ) : null}
      </div>
      <div className="gh-row">
        <span className="szo-date">{dateLabel}</span>
        <span className="timer">{time}</span>
      </div>
    </div>
  );
}
