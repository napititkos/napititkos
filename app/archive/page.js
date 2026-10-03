'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { enumerationFor } from '../../lib/format';
import { loadProgress, saveProgress } from '../../lib/progress';
import PuzzlePlayer from '../../components/PuzzlePlayer';
import Comments from '../../components/Comments';

const HU_MONTHS = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

export default function ArchivePage() {
  const { status } = useSession();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState({});
  const [archiveSolved, setArchiveSolved] = useState([]);
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [playingId, setPlayingId] = useState(null);
  const [gaveUpIds, setGaveUpIds] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});

  // Vendégeknek előzetes: csak darabszámok évre/hónapra bontva (konkrét rejtvény nélkül).
  const [teaser, setTeaser] = useState(null);
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    fetch('/api/archive/summary')
      .then((r) => r.json())
      .then((d) => setTeaser(d))
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const prog = loadProgress();
    setHistory(prog.history || {});
    setArchiveSolved(prog.archiveSolved || []);
    fetch('/api/archive', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setItems(data.archive || []))
      .catch(() => setError('Nem sikerült betölteni az archívumot.'));
  }, [status]);

  function isSolved(it) {
    return !!history[it.shownDate]?.correct || archiveSolved.includes(it.id);
  }

  function handleSolved(id, date) {
    const prog = loadProgress();
    if (!prog.archiveSolved) prog.archiveSolved = [];
    if (!prog.archiveSolved.includes(id)) {
      prog.archiveSolved.push(id);
      saveProgress(prog);
      // Utólagos megfejtés beszámítása az összesített megfejtőszámba (rejtvényenként egyszer).
      fetch('/api/archive/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      }).catch(() => {});
      setItems((prev) =>
        prev.map((x) => (x.shownDate === date && x.totalSolvers != null ? { ...x, totalSolvers: x.totalSolvers + 1 } : x))
      );
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

  if (status !== 'authenticated') {
    return (
      <div className="wrap">
        <h1 className="page-title">Korábbi titkosírások</h1>
        <div className="card">
          {status === 'loading' ? (
            <p style={{ margin: 0 }}>Betöltés…</p>
          ) : (
            <>
              {teaser && teaser.total > 0 ? (
                <>
                  <p style={{ marginTop: 0, fontSize: 15.5 }}>
                    <b>{teaser.total} korábbi titkosírás</b> vár rád, újra kijátszható formában, tippekkel és a régi
                    kommentekkel együtt.
                  </p>
                  <div className="teaser-list">
                    {Object.keys(teaser.byYear)
                      .sort((a, b) => b.localeCompare(a))
                      .map((y) => (
                        <div key={y} className="teaser-year">
                          <b>{y}</b>
                          <div className="teaser-months">
                            {Object.keys(teaser.byYear[y])
                              .sort((a, b) => b.localeCompare(a))
                              .map((m) => (
                                <span key={m} className="teaser-month">
                                  {HU_MONTHS[parseInt(m, 10) - 1]} <b>{teaser.byYear[y][m]}</b>
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                    Bejelentkezve azt is látod, melyiket fejtetted már meg, és hányan fejtették meg összesen.
                  </p>
                </>
              ) : (
                <p style={{ marginTop: 0 }}>
                  A korábbi titkosírások újrajátszásához és a régi kommentek megtekintéséhez jelentkezz be.
                </p>
              )}
              <a href="/login?callbackUrl=/archive" style={{ textDecoration: 'none' }}>
                <button className="primary">Bejelentkezés</button>
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

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
                                        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                                          {it.shownDate}
                                          {it.totalSolvers != null && ` · ${it.totalSolvers} megfejtő összesen`}
                                          {` · ${commentCounts[it.shownDate] ?? it.commentCount ?? 0} komment`}
                                        </span>
                                        <span style={{ fontSize: 12.5, color: solved ? 'var(--good)' : 'var(--ink-soft)' }}>
                                          {solved ? '✓ megfejtetted' : '– nem oldottad meg'}
                                        </span>
                                      </div>

                                      {!isPlaying && (
                                        <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, gap: 8 }}>
                                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {it.clue} {enumerationFor(it.answer)}
                                          </div>
                                          <button className="ghost small" style={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={() => setPlayingId(itemKey)}>
                                            ▶ Játssz
                                          </button>
                                        </div>
                                      )}

                                      {isPlaying && (
                                        <>
                                          <PuzzlePlayer
                                            puzzle={it}
                                            initiallySolved={solved}
                                            onSolved={() => handleSolved(it.id, it.shownDate)}
                                            onGaveUp={() => setGaveUpIds((prev) => [...prev, it.id])}
                                          />
                                          {solved && (
                                            <div style={{ marginTop: 12 }}>
                                              <b style={{ fontSize: 14 }}>
                                                Kommentek ezen a napon ({commentCounts[it.shownDate] ?? it.commentCount ?? 0})
                                              </b>
                                              <div style={{ marginTop: 6 }}>
                                                <Comments
                                                  date={it.shownDate}
                                                  readOnly
                                                  onCountChange={(n) => setCommentCounts((prev) => ({ ...prev, [it.shownDate]: n }))}
                                                />
                                              </div>
                                            </div>
                                          )}
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
