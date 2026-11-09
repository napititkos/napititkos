'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import EmojiGlyph from './EmojiGlyph';

// A teljes emojikészlet (a + gombról): görgethető lista csoportonként, magyar nevek és
// kulcsszavak szerinti keresővel. Az adat (public/emoji/hu.json, kb. 100 KB) csak megnyitáskor
// töltődik be, egyszer.
let cache = null;
function loadSet() {
  if (!cache) cache = fetch('/emoji/hu.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))));
  return cache;
}
const fold = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function EmojiPicker({ onPick, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    loadSet()
      .then(setData)
      .catch(() => {
        cache = null;
        setError(true);
      });
    inputRef.current?.focus();
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  // Keresés: a magyar névben és a kulcsszavakban, ékezettel és ékezet nélkül is.
  const groups = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.groups;
    const fneedle = fold(needle);
    const hits = [];
    for (const g of data.groups)
      for (const it of g.items) {
        const hay = `${it[1]} ${it[2]}`.toLowerCase();
        if (hay.includes(needle) || fold(hay).includes(fneedle)) hits.push(it);
      }
    return [{ name: `Találatok (${hits.length})`, items: hits }];
  }, [data, q]);

  return (
    <div className="modal-overlay emoji-picker-overlay" onClick={onClose}>
      <div className="modal-card emoji-picker" role="dialog" aria-label="Emoji választása" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-picker-head">
          <span className="emoji-picker-searchwrap">
          <svg className="emoji-picker-searchicon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            className="emoji-picker-search"
            placeholder="Keresés (pl. szív, macska, nevet)"
            aria-label="Emoji keresése"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          </span>
          <button type="button" className="emoji-picker-close" aria-label="Bezárás" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="emoji-picker-body">
          {error && <p className="community-rate-note">Nem sikerült betölteni az emojikat. Próbáld újra később.</p>}
          {!data && !error && <p className="community-rate-note">Betöltés…</p>}
          {groups.map((g) => (
            <section key={g.name} className="emoji-picker-group">
              <h3>{g.name}</h3>
              {g.items.length === 0 ? (
                <p className="community-rate-note">Nincs találat.</p>
              ) : (
                <div className="emoji-picker-grid">
                  {g.items.map(([e, label]) => (
                    <button key={e} type="button" className="emoji-picker-item" title={label} aria-label={label} onClick={() => onPick(e)}>
                      <EmojiGlyph e={e} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
