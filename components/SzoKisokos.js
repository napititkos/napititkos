'use client';
import { useState } from 'react';
import SzoGame from './SzoGame';
import RamCoach from './RamCoach';
import { recordSzoTutorial } from '../lib/gameProgress';

// Kisokos – Szókereső: a kos négy üzenetben bemutatja a játékot egy gyakorló rácson (mentés
// nélkül). A második lépésben a Szavak gombot kell megnyomni (villog), a harmadikban a panel
// látszik, a negyedikben a hibajelzés. A végén jár a „Szókereső-tanonc” trófea.
const DEMO = {"date":"kisokos","grid":["l","e","r","r","á","n","e","g","e"],"word":"regenerál","required":["len","rág","reá","egál","elán","láng","leng","ráng","reál","rege","reng","gerle","láger","lenge","negál","regále","regnál","generál","regenerál"],"bonus":["elrág","genre","lerág","ráleng"],"paths":{"lerág":[0,1,2,4,7],"len":[0,1,5],"leng":[0,1,5,7],"lenge":[0,1,5,7,6],"láng":[0,4,5,7],"láger":[0,4,7,6,3],"elrág":[1,0,3,4,7],"elán":[1,0,4,5],"reá":[2,1,4],"reál":[2,1,4,0],"reng":[2,1,5,7],"ráleng":[2,4,0,1,5,7],"ráng":[2,4,5,7],"rág":[2,4,7],"regále":[3,6,7,4,0,1],"regnál":[3,6,7,5,4,0],"rege":[3,6,7,8],"regenerál":[3,6,7,8,5,1,2,4,0],"negál":[5,8,7,4,0],"egál":[6,7,4,0],"gerle":[7,6,3,0,1],"generál":[7,8,5,1,2,4,0],"genre":[7,8,5,2,1]}};
const STEPS = [
  { target: '.szo-kisokos .szo-board', text: 'Új játékunk a Szókereső! Minden nap új 3×3-as rácsot kapsz, a te feladatod pedig, hogy megtaláld az összes szót. Egy betűt egyszer használhatsz; a betűket telefonon ujjal tudod összehúzni, számítógépen pedig az egér segítségével.' },
  { target: '.szo-kisokos .szo-words-btn', text: 'A Szavak listájánál láthatod az összesítést, nyomjunk rá!', wait: true },
  { target: '.szo-words-panel .szo-options', free: true, text: 'Itt láthatod a szavakat, amiket már megtaláltál, illetve azokat, amik még nincsenek meg. Tudsz segítséget is kérni ezeknek a dobozoknak a bepipálásával.' },
  { target: '.szo-words-panel .szo-report', free: true, place: 'above', text: 'Ha problémát észlelsz, itt tudod jelezni. Jó fejtegetést!' },
];

export default function SzoKisokos() {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const [closeKey, setCloseKey] = useState(0);
  const cur = STEPS[step];
  const next = () =>
    setStep((s) => {
      if (s + 1 >= STEPS.length) {
        recordSzoTutorial();
        setCloseKey((k) => k + 1); // az utolsó üzenet után a Szavak ablak bezárul
      }
      return s + 1;
    });
  return (
    <div className="card szo-kisokos">
      <p className="mini-muted" style={{ marginTop: 0 }}>Próbáld ki egy gyakorló rácson, hogyan működik a napi szókereső!</p>
      <SzoGame key={round} data={DEMO} preview showReport closeKey={closeKey} onPanel={(open) => open && step === 1 && setStep(2)} />
      <div className="mini-list-actions">
        <button type="button" className="ghost small" onClick={() => { setStep(0); setRound((r) => r + 1); }}>
          Újrakezdés
        </button>
      </div>
      {cur && (
        <RamCoach target={cur.target} place={cur.place || 'below'} scroll={!!cur.free} blocking={!cur.free} blink={cur.wait ? cur.target : undefined} onOk={cur.wait ? undefined : next}>
          {cur.text}
        </RamCoach>
      )}
    </div>
  );
}
