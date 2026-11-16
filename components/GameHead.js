// A játékok egységes fejléce (a titkosírás a minta, ugyanakkora címmel):
//   1. sor: balra a cím és a sorszám (pl. „Napi Sudoku #5”), jobbra a dátum;
//   2. sor: balra az időmérő, mellette a nehézség (ha van); jobbra a beküldő (ha van) és a
//           kiegészítő elem (trailing, pl. a sudoku 6×6 / 9×9 váltója).
export default function GameHead({ title, number, level, dateLabel, time, author = '', trailing = null }) {
  return (
    <div className="game-head">
      <div className="gh-row">
        <span className="gh-title puzzle-title">
          {title}
          {number > 0 && <span className="gh-no"> #{number}</span>}
        </span>
        {dateLabel && <span className="szo-date">{dateLabel}</span>}
      </div>
      <div className="gh-row">
        <span className="gh-left">
          <span className="timer">{time}</span>
          {level > 0 && (
            <span className="timer difficulty-pill gh-level" aria-label={`Nehézség: ${level}/5`}>
              Nehézség: {level}/5
            </span>
          )}
        </span>
        {(author || trailing) && (
          <span className="gh-right">
            {author && <span className="submitted-by">Beküldte: {author}</span>}
            {trailing}
          </span>
        )}
      </div>
    </div>
  );
}
