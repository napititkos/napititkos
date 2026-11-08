'use client';
import { useEffect, useRef, useState } from 'react';
import { deviceId } from '../lib/device';
import ReactionBar, { applyReaction } from './ReactionBar';

// Emoji-reakciók egy napi titkosírásra (főoldal: a megfejtés alatt; korábbi titkosírások:
// kinagyítva mindig látszanak, reagálni megfejtés után lehet). Bárki reagálhat; vendégként a
// névtelen eszközazonosító alapján. Az "initial" (a korábbi titkosírások listájával együtt
// letöltött adat) esetén nincs külön betöltés, így lenyitáskor azonnal megjelenik.
export default function DailyReactions({ date, interactive = true, initial = null, onChange }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    if (!date || initial) return;
    let alive = true;
    const dev = deviceId();
    fetch(`/api/reactions?date=${encodeURIComponent(date)}${dev ? `&device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Ha az előre letöltött adat csak a megjelenés után érkezik meg, azt használjuk.
  useEffect(() => {
    if (!data && initial) setData(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // A szülő (a korábbi titkosírások listája) naprakészen tartja az előre letöltött adatot, így
  // újranyitáskor is a friss állapot látszik.
  useEffect(() => {
    if (data && onChange) onChange({ counts: data.counts, mine: data.mine });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Azonnali (optimista) frissítés; a mentés a háttérben fut, hiba esetén visszaállunk. Gyors
  // egymás utáni koppintásnál mindig a legutolsó kérés válasza számít.
  function react(k) {
    if (!data) return;
    const before = data;
    setData({ ...data, counts: applyReaction(data.counts, data.mine, k), mine: k });
    setError('');
    const my = ++seq.current;
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, reaction: k, device: deviceId() }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (my !== seq.current) return;
        if (r.ok && d.ok) setData({ presets: d.presets, counts: d.counts, mine: d.mine });
        else {
          setData(before);
          setError(d.error === 'invalid-device' ? 'A reakcióhoz engedélyezd a böngésző helyi tárolóját.' : d.message || 'Nem sikerült elmenteni a reakciót.');
        }
      })
      .catch(() => {
        if (my !== seq.current) return;
        setData(before);
        setError('Nem sikerült elmenteni a reakciót.');
      });
  }

  if (!data) return null;
  const any = Object.values(data.counts || {}).some((n) => n > 0);
  return (
    <div className="daily-reactions">
      <ReactionBar presets={data.presets} counts={data.counts || {}} mine={data.mine} interactive={interactive} onReact={react} />
      {!interactive && <p className="community-rate-note">{any ? 'Megfejtés után te is reagálhatsz.' : 'Még nincs reakció. Megfejtés után te is reagálhatsz.'}</p>}
      {error && (
        <p className="community-rate-note" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
