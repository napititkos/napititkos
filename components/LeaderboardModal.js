'use client';
import { fmtDHM, fmtHMS, msUntilMidnight, msUntilMonday } from '../lib/budapestClock';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getIdentity } from '../lib/identity';
import Icon from './Icon';
import FramedModal, { GAME_HREF } from './FramedModal';

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
  // Visszaszámláló a nullázódásig (titkosírás: éjfél, óra:perc:mp; mini: hétfő 0:00, nap/óra/perc).
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Fülváltáskor csak a keretben lévő lista töltődik újra (a fejléc és a lábléc helyben marad).
  const bodyRef = useRef(null);
  function load(t) {
    setEntries(null);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    fetch(t === 'mini' ? '/api/mini/leaderboard' : t === 'szo' ? '/api/szo/leaderboard' : t === 'sudoku' ? '/api/sudoku/leaderboard' : '/api/leaderboard', { cache: 'no-store' })
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
    box.scrollTop = Math.max(0, me.offsetTop - box.clientHeight / 2 + me.offsetHeight / 2);
  }, [entries]);

  useEffect(() => {
    function handleOpen(e) {
      setMyName(session?.user?.name || getIdentity().name);
      const t = ['mini', 'szo', 'sudoku'].includes(e?.detail?.tab) ? e.detail.tab : 'daily';
      setTab(t);
      load(t);
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
      playHref={GAME_HREF[tab]}
      title={
        <>
          <Icon src="/icons/Ranglista.png" size={24} /> {tab === 'mini' ? 'Heti ranglista' : 'Mai ranglista'}
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
                  {i + 1}. {e.name}
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
