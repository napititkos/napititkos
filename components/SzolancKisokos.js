'use client';
import { useMemo, useState } from 'react';
import SzolancGame from './SzolancGame';
import RamCoach from './RamCoach';

// Kisokos – Szólánc (prototípus): a kos néhány üzenetben bemutatja a játékot egy rövid, kétlépéses
// gyakorló láncon (mentés nélkül). Két megoldás is jó: BOLT → BONT → FONT és BOLT → FOLT → FONT.
const DEMO = { date: 'kisokos', number: 0, level: 1, start: 'bolt', end: 'font', par: 2, paths: 2 };
const STEPS = [
  { target: '.szolanc-kisokos .szl-board', text: 'Új játékunk a Szólánc! A legfelső a kezdőszó, a szaggatott keretes legalul a célszó. Juss el az egyikből a másikba!' },
  { target: '.szolanc-kisokos .szl-row.current', text: 'Minden lépésben pontosan egy betűt cserélhetsz, a helye marad. Koppints a legalsó kész szóban arra a betűre, amelyiket cserélnéd (gépen az 1–4 vagy a nyilak).' },
  { target: '.szolanc-kisokos .szl-keys', text: 'Aztán írd be az új betűt a billentyűzeten. Ha létező szó lesz belőle (ragozott alak is jó), bekerül a láncba; a megváltozott betűt kiemeljük. A ↶ visszavonja az utolsó szót.' },
  { target: '.szolanc-kisokos .szl-row.target', text: 'A célszó azon betűi, amelyek már a helyükön vannak, kitöltve látszanak. Próbáld ki: BOLT-ból FONT, két lépésben! Két jó út is van: BOLT → BONT → FONT vagy BOLT → FOLT → FONT.' },
];

export default function SzolancKisokos() {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const demo = useMemo(() => DEMO, []);
  const cur = STEPS[step];
  return (
    <div className="card szolanc-kisokos">
      <p className="mini-muted" style={{ marginTop: 0 }}>Próbáld ki egy gyakorló láncon, hogyan működik a Szólánc!</p>
      <SzolancGame key={round} data={demo} preview />
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
