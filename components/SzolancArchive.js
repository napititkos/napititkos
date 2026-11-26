'use client';
import { applyArchiveFilter, filterEmptyText } from '../lib/archiveFilter';
import SolvedMark from './SolvedMark';
import { useEffect, useState } from 'react';
import SzolancGame from './SzolancGame';
import { recordSzolanc } from '../lib/gameProgress';
import { getIdentity } from '../lib/identity';
import { deviceId } from '../lib/device';

// Korábbi rejtvények – Szóláncok (a sudokuk mintájára): a korábbi napok Szóláncai a saját
// eredménnyel; rányomva lenyílik és játszható (a ranglistára már nem kerül fel).
function day(d) {
  try {
    return new Date(`${d}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
}

export default function SzolancArchive({ status = 'all', level = 'all' }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [openMonths, setOpenMonths] = useState({});
  const [openYears, setOpenYears] = useState({});
  useEffect(() => {
    fetch('/api/szolanc/archive', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401) setError('A korábbi Szóláncokhoz jelentkezz be.');
        setItems(d.items || []);
      })
      .catch(() => setItems([]));
  }, []);
  function toggle(d) {
    if (open === d) return setOpen(null);
    setOpen(d);
  }
  if (error) return <p>{error} <a href="/login?callbackUrl=/archive?tab=szolanc">Bejelentkezés</a></p>;
  if (!items) return <p>Betöltés…</p>;
  if (!items.length) return <p className="mini-muted">Még nincs korábbi Szólánc – a mai holnaptól kerül ide.</p>;
  // Év és hónap szerinti bontás (mint a korábbi titkosírásoknál): a legutóbbi hónap nyitva.
  const shown = applyArchiveFilter(items, { status, level }, { isSolved: (it) => !!it.solvedMs, levelOf: (it) => it.level });
  if (!shown.length) return <p className="mini-muted">{filterEmptyText(status, level)}</p>;
  const groups = [];
  for (const it of shown) {
    const [y, m] = it.date.split('-');
    let g = groups.find((x) => x.y === y);
    if (!g) groups.push((g = { y, months: [] }));
    let mo = g.months.find((x) => x.m === m);
    if (!mo) g.months.push((mo = { m, items: [] }));
    mo.items.push(it);
  }
  const monthName = (m) => new Date(Date.UTC(2026, Number(m) - 1, 15)).toLocaleDateString('hu-HU', { month: 'long' });
  // Alapból minden hónap le van csukva (mint a titkosírásoknál).
  const isOpen = (k) => openMonths[k] ?? false;
  // Ugyanaz a doboz-szerkezet, mint a korábbi titkosírásoknál: év doboz (lenyitható), benne hónap
  // dobozok (a legutóbbi nyitva), bennük a napok kártyái.
  const fullCount = (list) => list.filter((it) => it.solvedMs).length;
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  return (
    <div className="szo-archive">
      {groups.map((g) => {
        const yearOpen = openYears[g.y] ?? true;
        const yearItems = g.months.flatMap((m) => m.items);
        return (
          <div className="puzzle-editor" key={g.y}>
            <div className="szo-arch-yhead" role="button" tabIndex={0} aria-expanded={yearOpen} onClick={() => setOpenYears((o) => ({ ...o, [g.y]: !yearOpen }))} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpenYears((o) => ({ ...o, [g.y]: !yearOpen }))}>
              <b>
                {yearOpen ? '▾' : '▸'} {g.y}
              </b>
              <span>
                {fullCount(yearItems)}/{yearItems.length} megoldva
              </span>
            </div>
            {yearOpen && (
              <div style={{ marginTop: 12 }}>
                {g.months.map((mo) => {
                  const k = `${g.y}-${mo.m}`;
                  return (
                    <div key={k} className="archive-month">
                      <button type="button" className="archive-month-head" aria-expanded={isOpen(k)} onClick={() => setOpenMonths((o) => ({ ...o, [k]: !isOpen(k) }))}>
                        <b>
                          {isOpen(k) ? '▾' : '▸'} {monthName(mo.m)}
                        </b>
                        <span>
                          {fullCount(mo.items)}/{mo.items.length} megoldva
                        </span>
                      </button>
                      {isOpen(k) && (
                        <div className="archive-month-items mini-list">
                          {mo.items.map((it) => (
                            <div key={it.date} className={`card mini-list-item${open === it.date ? ' open' : ''}`}>
                              <button type="button" className="mini-list-head" aria-expanded={open === it.date} onClick={() => toggle(it.date)}>
                                <span className="szl-thumb" aria-hidden="true">
                                  <b>{it.start.toUpperCase()}</b>
                                  <span>↓</span>
                                  <b>{it.end.toUpperCase()}</b>
                                </span>
                                <span className="mini-list-meta">
                                  <b>{day(it.date)}</b>
                                  <span>
                                    #{it.number} · nehézség: {it.level}/5{it.solvedMs ? ` · ${it.steps} lépés, ${mmss(it.solvedMs)}` : ''}
                                  </span>
                                </span>
                                <span className="mini-list-chev" aria-hidden="true">
                                  {open === it.date ? '▴' : '▾'}
                                </span>
                                {it.solvedMs ? <SolvedMark /> : null}
                              </button>
                              {open === it.date && (
                                <div className="mini-list-body">
                                  <SzolancGame
                                    key={it.date}
                                    data={it}
                                    compact
                                    onSolved={({ chain, elapsed, steps }) => {
                                      recordSzolanc(it.date);
                                      fetch('/api/szolanc/solve', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ date: it.date, chain, elapsed, device: deviceId(), name: getIdentity().name }),
                                      }).catch(() => {});
                                      setItems((list) => list.map((x) => (x.date === it.date ? { ...x, solvedMs: elapsed, steps } : x)));
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
