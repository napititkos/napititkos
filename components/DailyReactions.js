'use client';
import { useEffect, useState } from 'react';
import { deviceId } from '../lib/device';

// Emoji-reakciók egy napi titkosírásra (főoldal: megfejtés után; korábbi titkosírások: kinagyítva
// mindig látszanak, reagálni megfejtés után lehet). A keretben csak az emoji, alatta, a kereten kívül
// a darabszám (a 0 nem látszik). Animáció ugyanaz, mint a közösségi rejtvényeknél.
// Amíg nincs saját reakció (vagy a sajátra kattintva újraválasztanál), a teljes emoji-sor látszik;
// utána csak azok, amelyekre már valaki reagált, a saját kiemelve.
// Bárki reagálhat; vendégként a névtelen eszközazonosító alapján.
export default function DailyReactions({ date, interactive = true }) {
  const [data, setData] = useState(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!date) return;
    let alive = true;
    const dev = deviceId();
    fetch(`/api/reactions?date=${encodeURIComponent(date)}${dev ? `&device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [date]);

  async function react(k) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reaction: k, device: deviceId() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setData({ emojis: d.emojis, reactions: d.reactions, mine: d.mine });
      else setError(d.error === 'invalid-device' ? 'A reakcióhoz engedélyezd a böngésző helyi tárolóját.' : d.message || 'Nem sikerült elmenteni a reakciót.');
    } catch {
      setError('Nem sikerült elmenteni a reakciót.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  const { emojis, reactions, mine } = data;
  const any = reactions.some((n) => n > 0);

  // Egy emoji: a keretes gomb (vagy kiemelés nélküli jelvény) csak az emojit tartalmazza, a darabszám
  // a kereten kívül, alatta áll (a 0 nem látszik, de a helyét megtartja).
  const count = (k) => (
    <span className={`reaction-count${reactions[k] ? '' : ' zero'}`} aria-hidden="true">
      {reactions[k]}
    </span>
  );
  const badge = (e, k) => (
    <span key={k} className="reaction-item">
      <span className="reaction-btn reaction-static" aria-label={`${e} reakció, ${reactions[k]} darab`} role="img">
        <span aria-hidden="true">{e}</span>
      </span>
      {count(k)}
    </span>
  );

  if (!interactive) {
    return (
      <div className="daily-reactions">
        {any ? (
          <div className="reaction-row reaction-stacked" role="group" aria-label="Reakciók">
            {emojis.map((e, k) => (reactions[k] > 0 ? badge(e, k) : null))}
          </div>
        ) : null}
        <p className="community-rate-note">{any ? 'Megfejtés után te is reagálhatsz.' : 'Még nincs reakció. Megfejtés után te is reagálhatsz.'}</p>
      </div>
    );
  }

  return (
    <div className="daily-reactions">
      {mine == null || pickOpen ? (
        <div className={`reaction-row reaction-stacked${pickOpen ? ' reaction-row-open' : ''}`} role="group" aria-label="Reakció választása">
          {emojis.map((e, k) => (
            <span key={k} className="reaction-item" style={{ '--i': k }}>
              <button
                type="button"
                className={`reaction-btn${mine === k ? ' on' : ''}`}
                aria-label={`${e} reakció, ${reactions[k]} darab`}
                aria-pressed={mine === k}
                disabled={busy}
                onClick={async () => {
                  if (mine !== k) await react(k);
                  setPickOpen(false);
                }}
              >
                <span aria-hidden="true">{e}</span>
              </button>
              {count(k)}
            </span>
          ))}
        </div>
      ) : (
        <div className="reaction-row reaction-stacked" role="group" aria-label="Reakciók">
          {emojis.map((e, k) =>
            reactions[k] > 0 ? (
              mine === k ? (
                <span key={k} className="reaction-item">
                  <button
                    type="button"
                    className="reaction-btn on mine"
                    aria-label={`A te reakciód: ${e}, összesen ${reactions[k]}. Koppints a módosításhoz.`}
                    title="A te reakciód - kattints a módosításhoz"
                    onClick={() => setPickOpen(true)}
                  >
                    <span aria-hidden="true">{e}</span>
                  </button>
                  {count(k)}
                </span>
              ) : (
                badge(e, k)
              )
            ) : null
          )}
        </div>
      )}
      {error && (
        <p className="community-rate-note" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
