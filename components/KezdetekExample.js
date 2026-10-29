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

export default function KezdetekExample({ progress, onProgress }) {
  // A haladást a Kisokos oldal adja: aki már megfejtette (akár másik eszközön), annak nincs
  // bemutató, csak a megoldott rejtvény.
  const done = (progress?.kezdetek || 0) >= 1;
  const [step, setStep] = useState(done ? 5 : 0); // 0..4 a kos üzenetei, 5 = szabad játék
  const [replay, setReplay] = useState(false); // a kos gombbal újra elmondott magyarázat

  useEffect(() => {
    // Ha közben megoldottá válik (pl. a szerverről érkező haladásból), a bemutató leáll.
    if (done && !replay) setStep(5);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  function solved() {
    const p = loadTutorialProgress();
    p.kezdetek = 1;
    saveTutorialProgress(p);
    onProgress && onProgress(p);
  }

  // 2-es lépés: a Tippek gomb villog, amíg a felhasználó meg nem nyomja; a tipp-ablak
  // megnyílásakor jön a tipptípusok bemutatása.
  useEffect(() => {
    if (step !== 2 && step !== 2.5) return undefined;
    const btn = () => document.querySelector(TIP_BTN);
    if (step === 2.5) btn()?.classList.add('coach-blink');
    const id = setInterval(() => {
      if (document.querySelector('.kezdetek-player .hint-modal-overlay')) {
        btn()?.classList.remove('coach-blink');
        setStep(3);
      }
    }, 200);
    return () => clearInterval(id);
  }, [step]);

  function openHints() {
    // A tipp-gomb megnyomása (a játék saját tipp-ablaka nyílik meg).
    const btn = [...document.querySelectorAll('.kezdetek-player button.play-btn')].find((b) => /\(/.test(b.innerText));
    btn && btn.click();
  }

  return (
    <div className="kezdetek-player" style={{ marginTop: 6 }}>
      <div className="tut-title-row">
        <h4 className="tut-task-title">1. Az első rejtvény</h4>
        <button
          type="button"
          className="tut-ram-btn"
          aria-label="A kos magyarázata"
          title="A kos magyarázata"
          onClick={() => {
            setReplay(true);
            setStep(0);
          }}
        >
          <img src="/logo-96.png" alt="" aria-hidden="true" width={34} height={34} />
        </button>
      </div>
      <PuzzlePlayer key={done ? 'kesz' : 'uj'} puzzle={PUZZLE} initiallySolved={done} onSolved={solved} hideShuffle />

      {step === 0 && (
        <RamCoach target=".kezdetek-player .puzzle-player" place="above" onOk={() => setStep(1)}>
          Üdvözöllek a Kisokosban! Először is nézzük a rejtvény két részét: a <b>szöveget</b> és a{' '}
          <b>megoldást</b>. A megoldás ablakba tudsz írni.
        </RamCoach>
      )}
      {step === 1 && (
        <RamCoach target=".kezdetek-player .clue-enum" place="below" onOk={() => setStep(replay || done ? 'types' : 2)}>
          Minden rejtvény mellé tartozik egy kis szám is, ami mutatja, hány karakterből áll a
          megfejtés. A dupla karakteres betűk (cs, gy stb.) kettőnek számítanak.
        </RamCoach>
      )}
      {step === 2 && (
        <RamCoach target={TIP_BTN} blink={TIP_BTN} place="above" onOk={() => setStep(2.5)}>
          Ha elakadnál, kérhetsz <b>tippeket</b>. Lássuk ezek fajtáit!
        </RamCoach>
      )}
      {step === 3 && (
        <RamCoach target=".kezdetek-player .hint-options" place="side" onOk={() => setStep(4)}>
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
      {step === 'types' && (
        <RamCoach
          target={null}
          place="bottom"
          onOk={() => {
            setReplay(false);
            setStep(5);
          }}
        >
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
        <RamCoach target=".kezdetek-player .hint-options" place="side" okLabel="Kezdjük!" onOk={() => setStep(5)}>
          A legtöbb rejtvényben mindhárom komponens - definíció, készlet, mutató - megjelenik: ezek
          azonosítása a rejtvény megfejtése. Most rajtad a sor!
        </RamCoach>
      )}
    </div>
  );
}
