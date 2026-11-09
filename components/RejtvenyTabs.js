'use client';
import { useEffect, useState } from 'react';

// Korábbi és Közösségi rejtvények: választó a fejlécben (Titkosírások / Minik), csak a mini
// élesítése után. A kiválasztott fül az URL-ben is megmarad (?tab=mini), így a link megosztható.
export function useMiniLive() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    fetch('/api/mini/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(!!d?.live))
      .catch(() => {});
  }, []);
  return live;
}

export function useRejtvenyTab() {
  const [tab, setTab] = useState('titkos');
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('tab') === 'mini') setTab('mini');
    } catch {}
  }, []);
  const choose = (t) => {
    setTab(t);
    try {
      const u = new URL(window.location.href);
      if (t === 'mini') u.searchParams.set('tab', 'mini');
      else u.searchParams.delete('tab');
      window.history.replaceState(null, '', u.toString());
    } catch {}
  };
  return [tab, choose];
}

export default function RejtvenyTabs({ tab, onChange, labels = { titkos: 'Titkosírások', mini: 'Minik' } }) {
  return (
    <div className="rejtveny-tabs" role="tablist" aria-label="Rejtvénytípus">
      {[
        ['titkos', labels.titkos],
        ['mini', labels.mini],
      ].map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? 'primary small' : 'ghost small'} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}
