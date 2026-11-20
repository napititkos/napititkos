'use client';
import { fmtDHM, fmtHMS, msUntilMidnight, msUntilMonday } from '../lib/budapestClock';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getIdentity } from '../lib/identity';
import Icon from './Icon';
import FramedModal, { GAME_HREF } from './FramedModal';
import { loadProgress } from '../lib/progress';
import { dailyDone, nextGameHref } from '../lib/dailyDone';

const LB_URL = (t, sz) => (t === 'mini' ? '/api/mini/leaderboard' : t === 'szo' ? '/api/szo/leaderboard' : t === 'sudoku' ? `/api/sudoku/leaderboard?size=${sz}` : '/api/leaderboard');
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
  const [miniLive, setMiniLive] = useState(false);
  // Sudoku: 6x6 / 9x9 választó a kereten belül (a fejléc nem változik); 9x9-ből nyitva a 9x9-es.
  const [sudSize, setSudSize] = useState(6);
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
      const t = ['mini', 'szo', 'sudoku'].includes(e?.detail?.tab) ? e.detail.tab : 'daily';
      const sz = Number(e?.detail?.size) === 9 ? 9 : 6;
      // Megfejtés után: csak akkor nyílik meg (felúszva), ha a játékos dobogós és már legalább 5
      // megfejtés van; ilyenkor a lista már betöltve érkezik (nem villan a „Betöltés...”).
      if (e?.detail?.auto) {
        let list = [];
        try {
          list = (await (await fetch(LB_URL(t, sz), { cache: 'no-store' })).json()).entries || [];
        } catch {}
        const rank = list.findIndex((x) => name && x.name === name);
        if (list.length < 5 || rank < 0 || rank > 2) return;
        setTab(t);
        setSudSize(sz);
        setEntries(list);
        setRise(true);
        setOpen(true);
        return;
      }
      setRise(false);
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
  const TABS = [
    ['daily', 'Titkosírás'],
    ['szo', 'Szókereső'],
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
            <div className="lb-tabs" role="tablist" aria-label="Ranglista választása">
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
        <p className="fm-empty">{tab === 'mini' ? 'Ezen a héten még senki nem fejtette meg - légy te az első!' : tab === 'szo' ? 'Ma még senki nem talált szót - légy te az első!' : tab === 'sudoku' ? 'Ma még senki nem oldotta meg - légy te az első!' : 'Ma még senki nem fejtette meg - légy te az első!'}</p>
      )}
      {entries && entries.length > 0 && (
        <div className="lb-list">
          {entries.map((e, i) => {
            const mine = !!myName && e.name === myName;
            return (
              <div key={i} className={`lb-entry${mine ? ' mine' : ''}`} data-me={mine ? '1' : undefined}>
                <span>
                  {i < 3 ? (
                    <span className="lb-medal" role="img" aria-label={`${i + 1}. hely`}>
                      {MEDALS[i]}
                    </span>
                  ) : (
                    `${i + 1}.`
                  )}{' '}
                  {e.name}
                </span>
                <span className="lb-entry-res">
                  {tab === 'mini' || tab === 'sudoku' ? formatTime(e.elapsed) : tab === 'szo' ? `${e.points} pont · ${formatTime(e.elapsed)}` : `${e.hintsUsed} tipp · ${formatTime(e.elapsed)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </FramedModal>
  );
}
