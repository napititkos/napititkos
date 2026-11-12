'use client';
import BackButton from '../../components/BackButton';
import SolvedMark from '../../components/SolvedMark';
import ResendVerification from '../../components/ResendVerification';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { enumerationFor } from '../../lib/format';
import { loadProgress, saveProgress } from '../../lib/progress';
import PuzzlePlayer from '../../components/PuzzlePlayer';
import DailyReactions from '../../components/DailyReactions';
import MiniArchive from '../../components/MiniArchive';
import SzoArchive from '../../components/SzoArchive';
import SudokuArchive from '../../components/SudokuArchive';
import RejtvenyTabs, { useMiniLive, useRejtvenyTab } from '../../components/RejtvenyTabs';
import ClueLine from '../../components/ClueLine';

const HU_MONTHS = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

export default function ArchivePage() {
  const { status } = useSession();
  // A mini élesítése után: „Korábbi rejtvények”, Titkosírások / Minik választóval.
  const miniLive = useMiniLive();
  const [kind, setKind, tabReady] = useRejtvenyTab();
  const [items, setItems] = useState(null);
  // A fiók haladásának megérkezése után (másik eszközön megfejtettek) frissítjük a megfejtett jelzéseket.
  useEffect(() => {
    const onSynced = () => setArchiveSolved(loadProgress().archiveSolved || []);
    window.addEventListener('progress-synced', onSynced);
    return () => window.removeEventListener('progress-synced', onSynced);
  }, []);
  const [presets, setPresets] = useState(null);
  const [error, setError] = useState(null);
  const [unverified, setUnverified] = useState(false);
  const [history, setHistory] = useState({});
  const [archiveSolved, setArchiveSolved] = useState([]);
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [playingId, setPlayingId] = useState(null);
  const [gaveUpIds, setGaveUpIds] = useState([]);

  // Vendégeknek előzetes: csak az összes korábbi titkosírás száma (konkrét rejtvény nélkül).
  const [teaser, setTeaser] = useState(null);
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    fetch('/api/archive/summary')
      .then((r) => r.json())
      .then((d) => setTeaser(d || false))
      .catch(() => setTeaser(false));
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const prog = loadProgress();
    setHistory(prog.history || {});
    setArchiveSolved(prog.archiveSolved || []);
    fetch('/api/archive', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'unverified') setUnverified(true);
        else {
          setPresets(data.presets || null);
          setItems(data.archive || []);
        }
      })
      .catch(() => setError('Nem sikerült betölteni az archívumot.'));
  }, [status]);

  function isSolved(it) {
    return !!history[it.shownDate]?.correct || archiveSolved.includes(it.id);
  }

  function handleSolved(id, date) {
    const prog = loadProgress();
    if (!prog.archiveSolved) prog.archiveSolved = [];
    // Az aznap már megfejtett titkosírás újrajátszása nem számít új megfejtésnek.
    const solvedOnDay = !!prog.history?.[date]?.correct;
    if (!prog.archiveSolved.includes(id) && !solvedOnDay) {
      prog.archiveSolved.push(id);
      saveProgress(prog);
      // A megfejtésszám-trófeákba a korábbi titkosírások megfejtései is beleszámítanak.
      window.dispatchEvent(new Event('achievements-recheck'));
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

  // Szűrő: összes / megfejtett / megfejtetlen.
  const [filter, setFilter] = useState('all');
  const grouped = useMemo(() => {
    if (!items) return {};
    const byYear = {};
    // A most nyitott (éppen játszott) rejtvény akkor is marad, ha közben kiesne a szűrőből
    // (pl. a "Megfejtetlen" nézetben megfejted).
    const list = items.filter(
      (it) => (playingId && String(playingId).startsWith(it.id)) || (filter === 'all' ? true : filter === 'solved' ? isSolved(it) : !isSolved(it))
    );
    for (const it of list) {
      const [y, m] = (it.shownDate || '').split('-');
      if (!y || !m) continue;
      if (!byYear[y]) byYear[y] = {};
      if (!byYear[y][m]) byYear[y][m] = [];
      byYear[y][m].push(it);
    }
    return byYear;
  }, [items, filter, history, archiveSolved, playingId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <h1 className="sr-only">Korábbi rejtvények</h1>
        <div className="kisokos-tabrow">
          <BackButton pill className="kisokos-back" />
        </div>
        <div className="card">
          {/* Amíg a bejelentkezés állapota vagy a darabszám nem ismert, csak "Betöltés…" látszik,
              hogy ne villanjon fel egy másik szöveg. */}
          {status === 'loading' || teaser === null ? (
            <p style={{ margin: 0, color: 'var(--ink-soft)' }}>Betöltés…</p>
          ) : (
            <>
              {teaser && (teaser.all ?? teaser.total) > 0 ? (
                <>
                  {/* Tízesre lefelé kerekítve (pl. „60+”), az összes játék korábbi rejtvényei együtt. */}
                  <p className="teaser-total">
                    <b>
                      {(teaser.all ?? teaser.total) >= 10 ? `${Math.floor((teaser.all ?? teaser.total) / 10) * 10}+` : teaser.all ?? teaser.total} rejtvény
                    </b>{' '}
                    <span className="teaser-wait">vár megfejtésre.</span>
                  </p>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                    Jelentkezz be, és újrajátszhatod őket tippekkel, és reagálhatsz is rájuk. Azt is
                    látod majd, melyiket fejtetted már meg, és hányan fejtették meg összesen.
                  </p>
                </>
              ) : (
                <p style={{ marginTop: 0 }}>
                  A korábbi titkosírások újrajátszásához jelentkezz be.
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
      <h1 className="sr-only">Korábbi rejtvények</h1>
      {/* A játékválasztó és a vissza (Játék) gomb egy sorban, mint a Kisokosban. */}
      <div className="kisokos-tabrow">
        {miniLive && <RejtvenyTabs tab={kind} onChange={setKind} withSzo withSudoku labels={{ titkos: 'Titkosírás', szo: 'Szókereső', mini: 'Mini', sudoku: 'Sudoku' }} />}
        <BackButton pill className="kisokos-back" />
      </div>
      {!tabReady ? null : miniLive && kind === 'sudoku' ? (
        <SudokuArchive />
      ) : miniLive && kind === 'szo' ? (
        <SzoArchive />
      ) : miniLive && kind === 'mini' ? (
        <MiniArchive />
      ) : (
      <div className="card archive-card">
        {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
        {unverified && (
          <ResendVerification text="A korábbi titkosírások megerősített e-mail-címmel érhetők el. Nézd meg a postaládádat, vagy kérj új visszaigazoló levelet:" />
        )}
        {items === null && !error && <p>Betöltés…</p>}
        {items && items.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>
            Még nincs egyetlen lezárt titkosírás sem - nézz vissza holnap!
          </p>
        )}

        {items && items.length > 0 && (
          <div className="archive-filter" role="group" aria-label="Szűrés">
            {[
              ['all', 'Összes'],
              ['solved', 'Megfejtett'],
              ['unsolved', 'Megfejtetlen'],
            ].map(([key, label]) => (
              <button key={key} type="button" className={`archive-filter-btn${filter === key ? ' on' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {items && items.length > 0 && years.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', textAlign: 'center', margin: '8px 0 0' }}>
            {filter === 'solved' ? 'Még nincs megfejtett korábbi titkosírásod.' : 'Minden korábbi titkosírást megfejtettél - szép munka!'}
          </p>
        )}

        {years.map((year) => {
          const months = grouped[year];
          // Az év legutóbbi hónapja (alapból ez van nyitva).
          const firstMonthKey = `${year}-${Object.keys(months).sort((a, b) => b.localeCompare(a))[0]}`;
          const yearItems = allYearItems(months);
          // Az évek alapból le vannak nyitva (a felhasználó becsukhatja őket).
          const yearOpen = openYears[year] ?? true;
          return (
            <div className="puzzle-editor" key={year}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setOpenYears((prev) => ({ ...prev, [year]: !(prev[year] ?? true) }))}
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
                      // Alapból a hónapok csukva vannak, a felhasználó nyithatja ki őket.
                      const monthOpen = monthOpenOf(openMonths, key, firstMonthKey);
                      return (
                        // Egy hónap = egy doboz (mappa), benne a napok önálló, kattintható kártyákként.
                        <div key={key} className="archive-month">
                          <button
                            type="button"
                            className="archive-month-head"
                            aria-expanded={monthOpen}
                            onClick={() => setOpenMonths((prev) => ({ ...prev, [key]: !monthOpenOf(prev, key, firstMonthKey) }))}
                          >
                            <b>
                              {monthOpen ? '▾' : '▸'} {HU_MONTHS[parseInt(month, 10) - 1]}
                            </b>
                            <span>
                              {solvedCount(monthItems)}/{monthItems.length} megfejtve
                            </span>
                          </button>

                          {monthOpen && (
                            <div className="archive-month-items">
                              {monthItems
                                .sort((a, b) => b.shownDate.localeCompare(a.shownDate))
                                .map((it, i) => {
                                  const solved = isSolved(it);
                                  const itemKey = it.id + i;
                                  const isPlaying = playingId === itemKey;
                                  return (
                                    <div className={`card community-item archive-item${isPlaying ? ' open' : ''}`} key={itemKey}>
                                      {isPlaying ? (
                                        <button type="button" className="community-close" aria-expanded={true} onClick={() => setPlayingId(null)}>
                                          ▴ Bezárás
                                        </button>
                                      ) : (
                                        <button type="button" className="community-head archive-head-compact" aria-expanded={false} onClick={() => setPlayingId(itemKey)}>
                                          {/* Kicsinyítve csak a kérdés látszik; ha megfejtette, jobbra egy pipa. */}
                                          <ClueLine text={`${it.clue} ${enumerationFor(it.answer)}`} className="community-clue" lines={8} />
                                          {solved && <SolvedMark />}
                                        </button>
                                      )}
                                      {isPlaying && (
                                        <div className="community-detail">
                                          {/* Lenyitva: dátum, megfejtők száma, megfejtetted. */}
                                          <div className="community-meta archive-meta archive-meta-open">
                                            <span className="community-rating-row">
                                              {solved && (
                                                <span className="community-solved" title="Megfejtetted">
                                                  ✓<span className="community-solved-text"> Megfejtetted</span>
                                                </span>
                                              )}
                                              <span>
                                                {formatDay(it.shownDate)}
                                                {it.totalSolvers != null && ` – ${it.totalSolvers} megfejtő`}
                                              </span>
                                            </span>
                                          </div>
                                          <PuzzlePlayer
                                            puzzle={it}
                                            initiallySolved={solved}
                                            dateLabel={formatDay(it.shownDate)}
                                            onSolved={() => handleSolved(it.id, it.shownDate)}
                                            onGaveUp={() => setGaveUpIds((prev) => [...prev, it.id])}
                                          />
                                          {/* Kinagyítva látszanak a reakciók; reagálni megfejtés után lehet. */}
                                          <DailyReactions date={it.shownDate} interactive={solved} initial={presets && it.reactions ? { presets, ...it.reactions } : null}
                                            onChange={(r) => setItems((prev) => prev.map((x) => (x.shownDate === it.shownDate ? { ...x, reactions: r } : x)))}
                                          />
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
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// Egy hónap nyitva van-e: amit a felhasználó állított; alapból mind csukva (csak az év nyitott).
function monthOpenOf(openMonths, key) {
  return openMonths[key] ?? false;
}

// "2026-10-12" -> "2026. október 12."
function formatDay(iso) {
  try {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

