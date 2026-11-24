'use client';
import { fmtDHM, fmtHMS, msUntilMidnight, msUntilMonday } from '../lib/budapestClock';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getIdentity } from '../lib/identity';
import Icon from './Icon';
import FramedModal, { GAME_HREF } from './FramedModal';
import { loadProgress } from '../lib/progress';
import { dailyDone, nextGameHref } from '../lib/dailyDone';

const LB_URL = (t, sz) => (t === 'mini' ? '/api/mini/leaderboard' : t === 'szo' ? '/api/szo/leaderboard' : t === 'szolanc' ? '/api/szolanc/leaderboard' : t === 'sudoku' ? `/api/sudoku/leaderboard?size=${sz}` : '/api/leaderboard');
// A ranglista fülének megfelelő napi játék (a „Következő játék” gombhoz).
const DONE_KEY = (t, sz) => (t === 'daily' ? 'titkos' : t === 'sudoku' ? (sz === 9 ? 'sudoku9' : 'sudoku6') : t);
const MEDALS = ['🥇', '🥈', '🥉'];

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function LeaderboardModal() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(null);
  const [myName, setMyName] = useState('');
  // Két ranglista (a mini élesítése után): Titkosírás (mai) és Keresztrejtvény (heti, idő szerint).
  const [tab, setTab] = useState('daily');
  // A Mini él: alapból igaz, így a játékválasztó fülek nem utólag ugranak be.
  const [miniLive, setMiniLive] = useState(true);
  // Sudoku: 6x6 / 9x9 választó a kereten belül (a fejléc nem változik); 9x9-ből nyitva a 9x9-es.
  const [sudSize, setSudSize] = useState(6);
  // Megnyitáskor a fülsor úgy áll be, hogy az aktuális játék füle látsszon, és a lehető legtöbb fül
  // egészben látsszon (a bal szélen mindig egész fül kezdődik). Utána nem görget magától: ha a
  // felhasználó elgörgeti, ott marad.
  const tabsRef = useRef(null);
  const [openSeq, setOpenSeq] = useState(0);
  useEffect(() => {
    const box = tabsRef.current;
    const on = box?.querySelector('[aria-selected="true"]');
    if (!box || !on) return;
    const right = on.offsetLeft + on.offsetWidth;
    if (right <= box.clientWidth) return void (box.scrollLeft = 0);
    // A legkisebb görgetés, amivel a kiválasztott fül jobb széle is látszik, egész fülhatárra kerekítve.
    const need = right - box.clientWidth + 4;
    const starts = [...box.querySelectorAll('button')].map((b) => b.offsetLeft - 2);
    box.scrollLeft = starts.find((x) => x >= need && x <= on.offsetLeft) ?? need;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSeq]);
  // Megfejtés után magától nyílt (felúszik).
  const [rise, setRise] = useState(false);
  // Visszaszámláló a nullázódásig (titkosírás: éjfél, óra:perc:mp; mini: hétfő 0:00, nap/óra/perc).
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Fülváltáskor csak a keretben lévő lista töltődik újra (a fejléc és a lábléc helyben marad).
  const bodyRef = useRef(null);
  function load(t, sz = sudSize) {
    setEntries(null);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    fetch(LB_URL(t, sz), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]));
  }
  // Ha van saját eredmény, a lista odaugrik, lehetőleg úgy, hogy a saját sor középen legyen.
  useEffect(() => {
    const box = bodyRef.current;
    if (!box || !entries?.length) return;
    const me = box.querySelector('[data-me="1"]');
    if (!me) return;
    // A rögzített felső sor (sudokunál a méretválasztó) alatti látható rész közepére.
    const bar = box.querySelector('.lb-subtabs');
    const top = bar ? bar.offsetHeight : 0;
    box.scrollTop = Math.max(0, me.offsetTop - top - (box.clientHeight - top) / 2 + me.offsetHeight / 2);
  }, [entries]);

  useEffect(() => {
    async function handleOpen(e) {
      const name = session?.user?.name || getIdentity().name;
      setMyName(name);
      const t = ['mini', 'szo', 'sudoku', 'szolanc'].includes(e?.detail?.tab) ? e.detail.tab : 'daily';
      const sz = Number(e?.detail?.size) === 9 ? 9 : 6;
      // Megfejtés után: csak akkor nyílik meg (felúszva), ha a játékos dobogós és már legalább 5
      // megfejtés van; ilyenkor a lista már betöltve érkezik (nem villan a „Betöltés...”).
      if (e?.detail?.auto) {
        const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
        const get = async () => {
          try {
            return (await (await fetch(LB_URL(t, sz), { cache: 'no-store' })).json()).entries || [];
          } catch {
            return [];
          }
        };
        const openAt = Number(e.detail.openAt) || Date.now();
        // A megoldás beküldésének egy pillanat kell; utána még a hullám alatt betöltjük a listát.
        await sleep(Math.min(400, openAt - Date.now()));
        let list = await get();
        let rank = list.findIndex((x) => name && x.name === name);
        // Ha a saját eredmény még nem volt benne (lassú beküldés), a hullám végén még egyszer.
        if (rank < 0) {
          await sleep(openAt - Date.now());
          list = await get();
          rank = list.findIndex((x) => name && x.name === name);
        }
        if (list.length < 5 || rank < 0 || rank > 2) return;
        await sleep(openAt - Date.now());
        setTab(t);
        setSudSize(sz);
        setEntries(list);
        setRise(true);
        setOpen(true);
        setOpenSeq((x) => x + 1);
        return;
      }
      setRise(false);
      setOpenSeq((x) => x + 1);
      setTab(t);
      setSudSize(sz);
      load(t, sz);
      fetch('/api/mini/status')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setMiniLive(!!d?.live))
        .catch(() => {});
      setOpen(true);
    }
    window.addEventListener('open-leaderboard', handleOpen);
    return () => window.removeEventListener('open-leaderboard', handleOpen);
  }, [session]);

  if (!open) return null;

  const close = () => setOpen(false);
  // Ha a játék ma már kész, a Játszom helyett a következő játék (a döntés megnyitáskor, a szöveg
  // nem vált át utólag).
  const prog = loadProgress();
  const doneHere = !!dailyDone(prog)[DONE_KEY(tab, sudSize)];
  const myRank = entries ? entries.findIndex((x) => myName && x.name === myName) : -1;
  const podium = myRank >= 0 && myRank < 3;
  // Rögzített sorrend (a főoldaléval egyezik), bármelyik játékból nyílik is.
  const TABS = [
    ['daily', 'Titkosírás'],
    ['szo', 'Szókereső'],
    ['szolanc', 'Szólánc'],
    ['sudoku', 'Sudoku'],
    ['mini', 'Heti Mini'],
  ];
  return (
    <FramedModal
      ref={bodyRef}
      labelId="lb-title"
      bodyLabel="Ranglista eredményei"
      onClose={close}
      playHref={doneHere ? nextGameHref(prog, DONE_KEY(tab, sudSize)) : tab === 'sudoku' && sudSize === 9 ? '/sudoku?m=9' : GAME_HREF[tab]}
      playLabel={
        doneHere ? (
          <>
            <span className="lbl-long">Következő játék</span>
            <span className="lbl-short">Kövi játék</span>
          </>
        ) : null
      }
      className={rise ? 'framed-rise' : ''}
      title={
        <>
          <Icon src="/icons/Ranglista.png" size={24} /> {tab === 'mini' ? 'Heti ranglista' : 'Mai ranglista'}
          {/* Dobogós helyezésnél – a listával együtt jelenik meg és tűnik el. */}
          {podium && <span className="lb-praise"> - szép munka!</span>}
        </>
      }
      head={
        <>
          <p className="lb-countdown" aria-live="off">
            {`Nullázódik: ${tab === 'mini' ? fmtDHM(msUntilMonday(new Date(tick))) : fmtHMS(msUntilMidnight(new Date(tick)))} múlva`}
          </p>
          {(miniLive || tab !== 'daily') && (
            <div className="lb-tabs" role="tablist" aria-label="Ranglista választása" ref={tabsRef}>
              {TABS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={tab === v}
                  className={tab === v ? 'primary small' : 'ghost small'}
                  onClick={() => {
                    if (tab === v) return;
                    setTab(v);
                    load(v);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      }
    >
      {tab === 'sudoku' && (
        <div className="lb-subtabs" role="tablist" aria-label="Sudoku mérete">
          {[6, 9].map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={sudSize === n}
              className={sudSize === n ? 'on' : ''}
              onClick={() => {
                if (sudSize === n) return;
                setSudSize(n);
                load('sudoku', n);
              }}
            >
              {n}×{n}
            </button>
          ))}
        </div>
      )}
      {entries === null && <p className="fm-loading">Betöltés...</p>}
      {entries && entries.length === 0 && (
        <p className="fm-empty">{tab === 'mini' ? 'Ezen a héten még senki nem fejtette meg - légy te az első!' : tab === 'szo' ? 'Ma még senki nem talált szót - légy te az első!' : tab === 'szolanc' ? 'Ma még senki nem fejtette meg - légy te az első!' : tab === 'sudoku' ? 'Ma még senki nem oldotta meg - légy te az első!' : 'Ma még senki nem fejtette meg - légy te az első!'}</p>
      )}
      {entries && entries.length > 0 && (
        <div className="lb-list">
          {entries.map((e, i) => {
            const mine = !!myName && e.name === myName;
            return (
              <div key={i} className={`lb-entry${mine ? ' mine' : ''}`} data-me={mine ? '1' : undefined}>
                <span className="lb-who">
                  {/* Egyforma széles helyezés-oszlop: az érmek és a számok egy vonalban, a nevek is. */}
                  <span className="lb-rank">
                    {i < 3 ? (
                      <span className="lb-medal" role="img" aria-label={`${i + 1}. hely`}>
                        {MEDALS[i]}
                      </span>
                    ) : (
                      `${i + 1}.`
                    )}
                  </span>
                  <span className="lb-name">{e.name}</span>
                </span>
                <span className="lb-entry-res">
                  {tab === 'mini' || tab === 'sudoku' ? formatTime(e.elapsed) : tab === 'szo' ? `${e.points} pont · ${formatTime(e.elapsed)}` : tab === 'szolanc' ? `${e.steps} lépés · ${formatTime(e.elapsed)}` : `${e.hintsUsed} tipp · ${formatTime(e.elapsed)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </FramedModal>
  );
}
