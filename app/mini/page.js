'use client';
import { useEffect, useState } from 'react';
import MiniPlayer from '../../components/MiniPlayer';
import DailyReactions from '../../components/DailyReactions';
import GameBar from '../../components/GameBar';
import ShareButton from '../../components/ShareButton';
import { weekLabel } from '../../lib/isoWeek';
import GameFooter from '../../components/GameFooter';
import { deviceId } from '../../lib/device';
import { getIdentity } from '../../lib/identity';
import { fireConfetti } from '../../components/Confetti';
import { recordMiniWeek } from '../../lib/gameProgress';

// A heti mini keresztrejtvény (csak élesítés után). Időzítő, ellenőrzés, megfejtéskor konfetti,
// statisztika (a te időd, átlagidő, teljesítések), emoji-reakciók és idő szerinti ranglista;
// minden hetente indul újra. A megfejtés ténye és ideje ezen az eszközön megmarad a hét végéig.
const KEY = 'titkositas_mini_v1';
function fmt(ms) {
  if (ms == null) return '–';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export default function MiniPage() {
  const [data, setData] = useState(null);
  const [local, setLocal] = useState(null);
  const [stats, setStats] = useState(null);

  // A rejtvényt azonnal betöltjük (a bejelentkezési süti a kéréssel együtt megy, nem kell
  // megvárni a munkamenet állapotát), így a rejtvény jelenik meg elsőként.
  useEffect(() => {
    const dev = deviceId();
    fetch(`/api/mini${dev ? `?device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setStats(d.stats || null);
        const l = loadLocal();
        // Ha egy másik eszközön (ugyanazzal a fiókkal) már megfejtette, a szerver tudja az idejét.
        const fromServer = d.stats?.mine ? { week: d.week, elapsed: d.stats.mine } : null;
        setLocal(l && l.week === d.week ? l : fromServer);
        if (d.stats?.mine) recordMiniWeek(d.week);
      })
      .catch(() => setData({ live: false }));
  }, []);

  async function solved(elapsed) {
    fireConfetti();
    recordMiniWeek(data.week);
    const rec = { week: data.week, elapsed };
    try {
      localStorage.setItem(KEY, JSON.stringify(rec));
    } catch {}
    setLocal(rec);
    try {
      const res = await fetch('/api/mini/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: data.week, elapsed, device: deviceId(), name: getIdentity().name }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.stats) setStats(d.stats);
    } catch {}
  }

  if (!data) return <div className="wrap"><div className="card">Betöltés…</div></div>;
  if (!data.live || !data.puzzle) {
    return (
      <div className="wrap">
        {data.live && <GameBar game="mini" />}
        <h1 className="sr-only">Heti Mini</h1>
        <div className="card">
          <p>{data.live ? 'Ezen a héten még nincs új mini keresztrejtvény. Nézz vissza később!' : 'A mini keresztrejtvény hamarosan érkezik.'}</p>
        </div>
        {data.live && <GameFooter game="mini" />}
      </div>
    );
  }

  const done = !!local;
  const myTime = stats?.mine ?? local?.elapsed ?? null;
  return (
    <div className="wrap mini-page mini-side">
      <GameBar game="mini" />
      <h1 className="sr-only">Heti Mini</h1>
      <div className="card">
        <MiniPlayer key={data.puzzle.id + (done ? '-kesz' : '')} rows={data.puzzle.rows} entries={data.puzzle.entries} onSolved={solved} solvedTime={done ? local.elapsed : null} dateLabel={weekLabel(data.week)} solvedMsg={false} />
        {data.puzzle.author && <div className="mini-author">Készítette: {data.puzzle.author}</div>}
        {done && (
          <>
            <div className="mini-stats" aria-label="Statisztika">
              <span className="pill">Időd: {fmt(myTime)}</span>
              <span className="pill">Átlagidő: {fmt(stats?.avg)}</span>
              <span className="pill">Teljesítések: {stats?.count ?? '–'}</span>
            </div>
            <DailyReactions date={data.week} scope="mini" interactive />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <ShareButton text={`🧩 Heti mini keresztrejtvény\nMegfejtettem ${fmt(myTime)} alatt!\nPróbáld ki te is: https://napititkos.hu/mini`} />
            </div>
          </>
        )}
      </div>
      {data?.live && <GameFooter game="mini" />}
    </div>
  );
}
