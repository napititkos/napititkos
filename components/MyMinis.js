'use client';
import { useEffect, useState } from 'react';
import MiniThumb from './MiniThumb';

// Profilom: a saját közösségi minijeim (csak a mini élesítése után, ha van ilyen), törléssel.
export default function MyMinis() {
  const [items, setItems] = useState(null);
  function load() {
    fetch('/api/community/minis', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.live ? (d.items || []).filter((x) => x.isOwner) : null))
      .catch(() => setItems(null));
  }
  useEffect(load, []);
  if (!items) return null;
  async function remove(it) {
    if (!confirm('Biztosan törlöd ezt a minit?')) return;
    await fetch(`/api/community/minis/${it.id}`, { method: 'DELETE' });
    load();
  }
  return (
    <div className="card">
      <div className="help-block" style={{ marginBottom: 0 }}>
        <h3>Közösségi minijeim ({items.length})</h3>
        {items.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>
            Még nem készítettél minit. <a href="/kozossegi/sajat-mini">Készíts egyet!</a>
          </p>
        ) : (
          <div className="mini-list">
            {items.map((it) => (
              <div key={it.id} className="my-mini">
                <MiniThumb rows={it.rows} filled />
                <span className="mini-list-meta">
                  <b>{it.entries.map((e) => e.word.toUpperCase()).slice(0, 4).join(', ')}{it.entries.length > 4 ? '…' : ''}</b>
                  <span>{it.solvers} megfejtő{it.reactionCount ? ` · ${it.reactionCount} reakció` : ''}{it.promoted ? ' · bekerült a heti minik közé' : ''}</span>
                </span>
                <button type="button" className="ghost small danger" onClick={() => remove(it)} aria-label="Mini törlése">
                  Törlés
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
