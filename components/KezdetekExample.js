'use client';
import { useEffect, useState } from 'react';
import PuzzlePlayer from './PuzzlePlayer';
import RamCoach from './RamCoach';
import { HINT_HELP } from '../lib/puzzleLogic';
import { loadTutorialProgress, saveTutorialProgress } from '../lib/tutorial';

// Kezdetek: kötött, lépésenkénti bemutató a kos üzeneteivel, majd a kezdő rejtvény megfejtése.
const PUZZLE = {
  id: 'tutorial-kezdetek',
  clue: 'Erős lett ez a fordulatos mozi!',
  answer: 'IZOM',
  answerWords: ['IZOM'],
  hints: {
    definicio: { enabled: true, text: 'Erős, egy erős dolgot keresünk.', words: [0] },
    fodder: { enabled: true, text: 'Mozi, ezt a szót kell formálni a megfejtéssé.', words: [5] },
    indikator: {
      enabled: true,
      text: 'Mutató szavunk a fordulatos, ami egy úgynevezett megfordító mutató, a készlet szavat fordítja meg, felfedve a megfejtést.',
      words: [4],
    },
    alternativ: { enabled: false, text: '' },
    betu: { enabled: true },
  },
};

const TIP_BTN = '.kezdetek-player .pa-right button.play-btn';

export default function KezdetekExample({ onProgress }) {
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0); // 0..4 a kos üzenetei, 5 = szabad játék
  useEffect(() => {
    if (loadTutorialProgress().kezdetek >= 1) {
      setDone(true);
      setStep(5);
    }
  }, []);

  function solved() {
    const p = loadTutorialProgress();
    p.kezdetek = 1;
    saveTutorialProgress(p);
    setDone(true);
    onProgress && onProgress(p);
  }

  function openHints() {
    // A tipp-gomb megnyomása (a játék saját tipp-ablaka nyílik meg).
    const btn = [...document.querySelectorAll('.kezdetek-player button.play-btn')].find((b) => /\(/.test(b.innerText));
    btn && btn.click();
  }

  return (
    <div className="kezdetek-player" style={{ marginTop: 6 }}>
      <PuzzlePlayer puzzle={PUZZLE} initiallySolved={done} onSolved={solved} />
      {done && (
        <div className="feedback good" style={{ marginLeft: 0 }}>
          ✓ Megfejtetted: a „mozi” megfordítva IZOM, ami erős. Most már játszhatsz a többi résszel is!
        </div>
      )}

      {step === 0 && (
        <RamCoach target=".kezdetek-player .player-letters" place="below" onOk={() => setStep(1)}>
          Szia! Fent van a <b>rejtvény</b>, lent pedig a <b>megoldás</b> helye, ahová írni tudsz.
        </RamCoach>
      )}
      {step === 1 && (
        <RamCoach target=".kezdetek-player .clue-enum" place="below" onOk={() => setStep(2)}>
          Minden rejtvény mellé tartozik egy kis szám is, ami mutatja, hány karakterből áll a
          megfejtés. A dupla karakteres betűk (cs, gy stb.) kettőnek számítanak.
        </RamCoach>
      )}
      {step === 2 && (
        <RamCoach
          target={TIP_BTN}
          place="above"
          onOk={() => {
            openHints();
            setStep(3);
          }}
        >
          Ha elakadsz, tudsz használni <b>tippeket</b> - ezzel a gombbal kérheted őket.
        </RamCoach>
      )}
      {step === 3 && (
        <RamCoach target={null} place="bottom" onOk={() => setStep(4)}>
          <b>Négyféle tippet kérhetsz:</b>
          <ul className="coach-list">
            <li>
              <b>Definíció:</b> {HINT_HELP.definicio}
            </li>
            <li>
              <b>Készlet:</b> {HINT_HELP.fodder}
            </li>
            <li>
              <b>Mutató:</b> {HINT_HELP.indikator}
            </li>
            <li>
              <b>Helyes betű:</b> {HINT_HELP.betu}
            </li>
          </ul>
        </RamCoach>
      )}
      {step === 4 && (
        <RamCoach target={null} place="bottom" okLabel="Kezdjük!" onOk={() => setStep(5)}>
          A legtöbb rejtvényben mindhárom komponens - definíció, készlet, mutató - megjelenik: ezek
          azonosítása a rejtvény megfejtése. Most rajtad a sor!
        </RamCoach>
      )}
    </div>
  );
}
