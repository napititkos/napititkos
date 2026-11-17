'use client';
import SolvedMark from './SolvedMark';
import { useEffect, useState } from 'react';
import SudokuGame from './SudokuGame';
import { recordSudoku } from '../lib/gameProgress';
import { deviceId } from '../lib/device';

// Korábbi rejtvények – Sudokuk (a szókeresők mintájára): a korábbi napok szókeresői, a saját eredménnyel; rányomva
// lenyílik és tovább játszható (a ranglistára már nem kerül fel).
function day(d) {
  try {
    return new Date(`${d}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
}

// size: 6 vagy 9 – a két méretnek külön archívuma van (a választó a játékválasztó alatt).
export default function SudokuArchive({ size = 6 }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [game, setGame] = useState(null);
  const [openMonths, setOpenMonths] = useState({});
  const [openYears, setOpenYears] = useState({});
  useEffect(() => {
    setItems(null);
    setOpen(null);
    setGame(null);
    fetch(`/api/sudoku/archive?size=${size}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401) setError('A korábbi sudokukhoz jelentkezz be.');
        setItems(d.items || []);
      })
      .catch(() => setItems([]));
  }, [size]);
  function load(d, sz) {
    setGame(null);
    const dev = deviceId();
    fetch(`/api/sudoku?date=${d}&size=${sz}${dev ? `&device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((g) => setGame({ ...g, _size: sz }))
      .catch(() => {});
  }
  function toggle(d) {
    if (open === d) return setOpen(null);
    setOpen(d);
    load(d, size);
  }
  if (error) return <p>{error} <a href="/login?callbackUrl=/archive?tab=sudoku">Bejelentkezés</a></p>;
  if (!items) return <p>Betöltés…</p>;
  if (!items.length) return <p className="mini-muted">Még nincs korábbi sudoku – a mai holnaptól kerül ide.</p>;
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
                                <span className={`sudoku-thumb${size === 9 ? " t9" : ""}`} aria-hidden="true">
                                  {it.givens.map((n, i) => (
                                    <span key={i}>{n || ''}</span>
                                  ))}
                                </span>
                                <span className="mini-list-meta">
                                  <b>{day(it.date)}</b>
                                  <span>
                                    #{it.number} · nehézség: {it.level}/5{it.solvedMs ? ` · megoldva ${mmss(it.solvedMs)}` : ''}
                                  </span>
                                </span>
                                <span className="mini-list-chev" aria-hidden="true">
                                  {open === it.date ? '▴' : '▾'}
                                </span>
                                {it.solvedMs ? <SolvedMark /> : null}
                              </button>
                              {open === it.date && (
                                <div className="mini-list-body">
                                  {game?.givens && game._size === size ? (
                                    <SudokuGame
                                      key={`${it.date}-${size}`}
                                      data={game}
                                      compact
                                      solvedTime={game.mine}
                                      onSolved={(el) => {
                                        recordSudoku(it.date, size);
                                        setItems((list) => list.map((x) => (x.date === it.date ? { ...x, solvedMs: el } : x)));
                                      }}
                                    />
                                  ) : (
                                    <p>Betöltés…</p>
                                  )}
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
