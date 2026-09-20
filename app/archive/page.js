'use client';
import { useEffect, useMemo, useState } from 'react';
import { enumerationFor } from '../../lib/format';
import { loadProgress, saveProgress } from '../../lib/progress';
import PuzzlePlayer from '../../components/PuzzlePlayer';

const HU_MONTHS = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

export default function ArchivePage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState({});
  const [archiveSolved, setArchiveSolved] = useState([]);
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    const prog = loadProgress();
    setHistory(prog.history || {});
    setArchiveSolved(prog.archiveSolved || []);
    fetch('/api/archive')
      .then((r) => r.json())
      .then((data) => setItems(data.archive || []))
      .catch(() => setError('Nem sikerült betölteni az archívumot.'));
  }, []);

  function isSolved(it) {
    return !!history[it.shownDate]?.correct || archiveSolved.includes(it.id);
  }

  function handleSolved(id) {
    const prog = loadProgress();
    if (!prog.archiveSolved) prog.archiveSolved = [];
    if (!prog.archiveSolved.includes(id)) {
      prog.archiveSolved.push(id);
      saveProgress(prog);
    }
    setArchiveSolved(prog.archiveSolved);
  }

  const grouped = useMemo(() => {
    if (!items) return {};
    const byYear = {};
    for (const it of items) {
      const [y, m] = (it.shownDate || '').split('-');
      if (!y || !m) continue;
      if (!byYear[y]) byYear[y] = {};
      if (!byYear[y][m]) byYear[y][m] = [];
      byYear[y][m].push(it);
    }
    return byYear;
  }, [items]);

  function solvedCount(list) {
    return list.filter((it) => isSolved(it)).length;
  }
  function allYearItems(months) {
    return Object.values(months).flat();
  }

  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="wrap">
      <h1 className="page-title">Korábbi titkosírások</h1>
      <div className="card">
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 0 }}>
          A "megfejtve" jelzés csak ezen az eszközön/böngészőn (illetve bejelentkezve a
          fiókodhoz kötve) számolja a saját teljesítményedet.
        </p>
        {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
        {items === null && !error && <p>Betöltés…</p>}
        {items && items.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>
            Még nincs egyetlen lezárt titkosírás sem - nézz vissza holnap!
          </p>
        )}

        {years.map((year) => {
          const months = grouped[year];
          const yearItems = allYearItems(months);
          const yearOpen = !!openYears[year];
          return (
            <div className="puzzle-editor" key={year}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))}
              >
                <b>{yearOpen ? '▾' : '▸'} {year}</b>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  {solvedCount(yearItems)}/{yearItems.length} megfejtve
                </span>
              </div>

              {yearOpen && (
                <div style={{ marginTop: 12 }}>
                  {Object.keys(months)
                    .sort((a, b) => b.localeCompare(a))
                    .map((month) => {
                      const monthItems = months[month];
                      const key = `${year}-${month}`;
                      const monthOpen = !!openMonths[key];
                      return (
                        <div key={key} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }))}
                          >
                            <b style={{ fontSize: 14.5 }}>
                              {monthOpen ? '▾' : '▸'} {HU_MONTHS[parseInt(month, 10) - 1]}
                            </b>
                            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                              {solvedCount(monthItems)}/{monthItems.length} megfejtve
                            </span>
                          </div>

                          {monthOpen && (
                            <div style={{ marginTop: 10 }}>
                              {monthItems
                                .sort((a, b) => b.shownDate.localeCompare(a.shownDate))
                                .map((it, i) => {
                                  const solved = isSolved(it);
                                  const itemKey = it.id + i;
                                  const isPlaying = playingId === itemKey;
                                  return (
                                    <div className="sub-item" key={itemKey}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{it.shownDate}</span>
                                        <span style={{ fontSize: 12.5, color: solved ? 'var(--good)' : 'var(--ink-soft)' }}>
                                          {solved ? '✓ megfejtetted' : '– nem oldottad meg'}
                                        </span>
                                      </div>

                                      {!isPlaying && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 }}>
                                          <div>{it.clue} {enumerationFor(it.answer)}</div>
                                          <button className="ghost small" onClick={() => setPlayingId(itemKey)}>
                                            ▶ Játssz
                                          </button>
                                        </div>
                                      )}

                                      {isPlaying && (
                                        <>
                                          <PuzzlePlayer
                                            puzzle={it}
                                            initiallySolved={solved}
                                            onSolved={() => handleSolved(it.id)}
                                          />
                                          <div style={{ marginTop: 10 }}>
                                            <button className="ghost small" onClick={() => setPlayingId(null)}>
                                              Bezárás
                                            </button>
                                          </div>
                                        </>
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}