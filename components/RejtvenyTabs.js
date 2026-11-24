'use client';
import { useEffect, useRef, useState } from 'react';

// Korábbi és Közösségi rejtvények: választó a fejlécben (Titkosírások / Minik), csak a mini
// élesítése után. A kiválasztott fül az URL-ben is megmarad (?tab=mini), így a link megosztható.
// Az új játékok élesítve vannak, ezért alapból igaz (nincs villanás); a szerver felülírhatja.
export function useMiniLive() {
  const [live, setLive] = useState(true);
  useEffect(() => {
    fetch('/api/mini/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(!!d?.live))
      .catch(() => {});
  }, []);
  return live;
}

// ready: a fül az URL-ből már kiolvasva – addig a fülhöz tartozó tartalom nem jelenik meg, így
// a ?tab=mini linkről érkezve sem villan fel előbb a titkosírások listája.
export function useRejtvenyTab() {
  const [tab, setTab] = useState('titkos');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'mini' || t === 'szo' || t === 'sudoku' || t === 'szolanc') setTab(t);
    } catch {}
    setReady(true);
  }, []);
  const choose = (t) => {
    setTab(t);
    try {
      const u = new URL(window.location.href);
      if (t === 'mini' || t === 'szo' || t === 'sudoku') u.searchParams.set('tab', t);
      else u.searchParams.delete('tab');
      window.history.replaceState(null, '', u.toString());
    } catch {}
    window.dispatchEvent(new CustomEvent('rejtveny-tab', { detail: t }));
  };
  return [tab, choose, ready];
}

export default function RejtvenyTabs({ tab, onChange, labels = { titkos: 'Titkosírások', mini: 'Minik' }, withSzo = false, withSudoku = false, withSzolanc = false }) {
  // Ha a fülek nem férnek ki (vízszintesen görgethetők), betöltéskor a kiválasztott fül látsszon;
  // utána nem görget magától.
  const ref = useRef(null);
  useEffect(() => {
    const box = ref.current;
    const on = box?.querySelector('[aria-selected="true"]');
    if (!box || !on || box.scrollWidth <= box.clientWidth) return;
    const right = on.offsetLeft + on.offsetWidth;
    if (right > box.clientWidth) box.scrollLeft = right - box.clientWidth + 4;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="rejtveny-tabs" role="tablist" aria-label="Rejtvénytípus" ref={ref}>
      {[
        ['titkos', labels.titkos],
        ...(withSzo ? [['szo', labels.szo || 'Szókeresők']] : []),
        ...(withSzolanc ? [['szolanc', labels.szolanc || 'Szólánc']] : []),
        ['mini', labels.mini],
        ...(withSudoku ? [['sudoku', labels.sudoku || 'Sudoku']] : []),
      ].map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? 'primary small' : 'ghost small'} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}
