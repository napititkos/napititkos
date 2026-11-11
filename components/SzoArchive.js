'use client';
import { useEffect, useState } from 'react';
import SzoGame from './SzoGame';
import { deviceId } from '../lib/device';

// Korábbi rejtvények – Szókeresők: a korábbi napok szókeresői, a saját eredménnyel; rányomva
// lenyílik és tovább játszható (a ranglistára már nem kerül fel).
function day(d) {
  try {
    return new Date(`${d}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
}

export default function SzoArchive() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [game, setGame] = useState(null);
  const [openMonths, setOpenMonths] = useState({});
  useEffect(() => {
    fetch('/api/szo/archive', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401) setError('A korábbi szókeresőkhöz jelentkezz be.');
        setItems(d.items || []);
      })
      .catch(() => setItems([]));
  }, []);
  function toggle(d) {
    if (open === d) return setOpen(null);
    setOpen(d);
    setGame(null);
    const dev = deviceId();
    fetch(`/api/szo?date=${d}${dev ? `&device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setGame)
      .catch(() => {});
  }
  if (error) return <p>{error} <a href="/login?callbackUrl=/archive?tab=szo">Bejelentkezés</a></p>;
  if (!items) return <p>Betöltés…</p>;
  if (!items.length) return <p className="mini-muted">Még nincs korábbi szókereső – a mai holnaptól kerül ide.</p>;
  // Év és hónap szerinti bontás (mint a korábbi titkosírásoknál): a legutóbbi hónap nyitva.
  const groups = [];
  for (const it of items) {
    const [y, m] = it.date.split('-');
    let g = groups.find((x) => x.y === y);
    if (!g) groups.push((g = { y, months: [] }));
    let mo = g.months.find((x) => x.m === m);
    if (!mo) g.months.push((mo = { m, items: [] }));
    mo.items.push(it);
  }
  const monthName = (m) => new Date(Date.UTC(2026, Number(m) - 1, 15)).toLocaleDateString('hu-HU', { month: 'long' });
  const firstKey = groups[0] ? `${groups[0].y}-${groups[0].months[0].m}` : null;
  const isOpen = (k) => (openMonths[k] ?? k === firstKey);
  return (
    <div className="szo-archive">
      {groups.map((g) => (
        <section key={g.y} className="szo-arch-year">
          <h2 className="szo-arch-y">{g.y}</h2>
          {g.months.map((mo) => {
            const k = `${g.y}-${mo.m}`;
            return (
              <div key={k} className="szo-arch-month">
                <button type="button" className="archive-month-head" aria-expanded={isOpen(k)} onClick={() => setOpenMonths((o) => ({ ...o, [k]: !isOpen(k) }))}>
                  <span>{monthName(mo.m)}</span>
                  <span className="mini-muted">{mo.items.length} szókereső {isOpen(k) ? '▴' : '▾'}</span>
                </button>
                {isOpen(k) && (
    <div className="mini-list">
      {mo.items.map((it) => (
        <div key={it.date} className={`card mini-list-item${open === it.date ? ' open' : ''}`}>
          <button type="button" className="mini-list-head" aria-expanded={open === it.date} onClick={() => toggle(it.date)}>
            <span className="szo-thumb" aria-hidden="true">
              {it.grid.map((ch, i) => (
                <span key={i}>{String(ch).toUpperCase()}</span>
              ))}
            </span>
            <span className="mini-list-meta">
              <b>{day(it.date)}</b>
              <span>{it.count ? `${it.count} / ${it.total} szó · ${it.points} pont` : `${it.total} szó vár rád`}</span>
            </span>
            <span className="mini-list-chev" aria-hidden="true">{open === it.date ? '▴' : '▾'}</span>
          </button>
          {open === it.date && <div className="mini-list-body">{game?.grid ? <SzoGame key={it.date} data={game} compact /> : <p>Betöltés…</p>}</div>}
        </div>
      ))}
    </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
