'use client';
import { useState } from 'react';
import MiniPlayer from './MiniPlayer';
import RamCoach from './RamCoach';

// Kisokos – Mini: a kos három üzenetben elmagyarázza a mini keresztrejtvény kezelését, közben egy
// gyakorló rejtvényen ki is próbálható.
const ROWS = [
  ['k', 'o', 's', '#', '#'],
  ['o', 'k', 'o', 's', '#'],
  ['s', 'o', 'k', '#', '#'],
  ['#', 's', '#', '#', '#'],
  ['#', '#', '#', '#', '#'],
];
const ENTRIES = [
  { dir: 'A', row: 0, col: 0, len: 3, word: 'kos', clue: 'Hím juh' },
  { dir: 'A', row: 1, col: 0, len: 4, word: 'okos', clue: 'Eszes, értelmes' },
  { dir: 'A', row: 2, col: 0, len: 3, word: 'sok', clue: 'Nem kevés' },
  { dir: 'A', row: 3, col: 1, len: 1, word: 's', clue: 'A „sok” első betűje' },
  { dir: 'D', row: 0, col: 0, len: 3, word: 'kos', clue: 'A nyáj vezére lehet' },
  { dir: 'D', row: 0, col: 1, len: 4, word: 'okos', clue: 'Nem buta' },
  { dir: 'D', row: 0, col: 2, len: 3, word: 'sok', clue: 'Bőséges mennyiség' },
  { dir: 'D', row: 1, col: 3, len: 1, word: 's', clue: 'Az „okos” utolsó betűje' },
];
const STEPS = [
  {
    target: '.mini-kisokos .mini-board',
    text: 'A Mini keresztrejtvénynél soronként és oszloponként (kivilágítva egyet-egyet) kell kitöltened a rejtvényt. Eredményt csak akkor fogsz látni, ha helyesen kitöltöd az egészet.',
  },
  { target: '.mini-kisokos .mini-board', text: 'Ha sorról oszlopra vagy oszlopról sorra váltanál, elég még egyszer rányomnod a cellára, amin épp állsz.' },
  { target: '.mini-kisokos .mini-player-top button', text: 'Ha elbizonytalanodtál, nyomj az Ellenőrzés gombra, ami kijelzi, mely betűid helyesek. Jó fejtést!' },
];

export default function MiniKisokos() {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const cur = STEPS[step];
  return (
    <div className="card mini-kisokos mini-side">
      <p className="mini-muted" style={{ marginTop: 0 }}>Próbáld ki egy gyakorló rejtvényen, hogyan működik a heti mini keresztrejtvény!</p>
      <MiniPlayer key={round} rows={ROWS} entries={ENTRIES} />
      <div className="mini-list-actions">
        <button type="button" className="ghost small" onClick={() => { setStep(0); setRound((r) => r + 1); }}>
          Újrakezdés
        </button>
      </div>
      {cur && (
        <RamCoach target={cur.target} place="below" onOk={() => setStep((s) => s + 1)}>
          {cur.text}
        </RamCoach>
      )}
    </div>
  );
}
