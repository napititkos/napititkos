'use client';
import { useMemo, useState } from 'react';
import SudokuGame from './SudokuGame';
import RamCoach from './RamCoach';
import { generateSudoku } from '../lib/sudokuGen';

// Kisokos – Sudoku: a kos néhány üzenetben bemutatja a játékot egy könnyű gyakorló rejtvényen
// (mentés nélkül).
const STEPS = [
  { target: '.sudoku-kisokos .sudoku-board', text: 'Új játékunk a Sudoku! Minden nap új 6×6-os rácsot kapsz: minden sorba, minden oszlopba és minden vastagabb vonallal határolt 2×3-as dobozba az 1–6 számok kerülnek, mindegyik pontosan egyszer.' },
  { target: '.sudoku-kisokos .sudoku-pad', text: 'Válassz egy cellát, majd nyomj egy számra. Gépen a billentyűzettel is beírhatod. A Törlés kitörli a cellát, a Vissza visszavonja az utolsó lépést, és egy beírt számot bármikor felülírhatsz.' },
  { target: '.sudoku-kisokos .sudoku-key.note', text: 'A Jegyzet bekapcsolásával kis számokat írhatsz egy cellába: azokat, amelyek még szóba jöhetnek.' },
  { target: '.sudoku-kisokos .sudoku-board', text: 'Ha egy szám ütközik egy másikkal (ugyanaz a szám egy sorban, oszlopban vagy dobozban), pirossal jelöljük.' },
  { target: '.sudoku-kisokos .gh-level', text: 'A rács fölött látod a nehézséget: hétfőn és kedden 1/5, szerdán és csütörtökön 2/5, pénteken 3/5, szombaton 4/5, vasárnap 5/5.' },
];

export default function SudokuKisokos() {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const demo = useMemo(() => {
    const p = generateSudoku('kisokos');
    return { date: 'kisokos', level: 1, givens: p.givens, number: 0 };
  }, []);
  const cur = STEPS[step];
  return (
    <div className="card sudoku-kisokos">
      <p className="mini-muted" style={{ marginTop: 0 }}>Próbáld ki egy gyakorló rejtvényen, hogyan működik a napi sudoku!</p>
      <SudokuGame key={round} data={demo} preview />
      <div className="mini-list-actions">
        <button
          type="button"
          className="ghost small"
          onClick={() => {
            setStep(0);
            setRound((r) => r + 1);
          }}
        >
          Újrakezdés
        </button>
      </div>
      {cur && (
        <RamCoach target={cur.target} place="below" scroll={false} onOk={() => setStep((s) => s + 1)}>
          {cur.text}
        </RamCoach>
      )}
    </div>
  );
}
