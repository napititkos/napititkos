'use client';
import { useEffect, useRef, useState } from 'react';

// Az oldal stílusához illő legördülő választó (a böngésző saját, szögletes és fehér keretes
// listája helyett): buborék alakú gomb, alatta lekerekített lista. Billentyűzettel is kezelhető
// (nyilak, Enter, Escape), és kívülre kattintva bezárul.
//   value, onChange(value), options: [[value, label]], label: képernyőolvasó felirat
export default function PrettySelect({ value, onChange, options, label = 'Választás', className = '' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, options.findIndex(([v]) => v === value)));
  const ref = useRef(null);
  const current = options.find(([v]) => v === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  function choose(i) {
    setOpen(false);
    const v = options[i]?.[0];
    if (v !== undefined && v !== value) onChange(v);
  }
  function onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) choose(active);
      else setOpen(true);
    } else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className={`pselect ${open ? 'open' : ''} ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="pselect-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.[1] || ''}`}
        onClick={() => {
          setActive(Math.max(0, options.findIndex(([v]) => v === value)));
          setOpen((o) => !o);
        }}
        onKeyDown={onKey}
      >
        <span>{current?.[1]}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="pselect-list" role="listbox" aria-label={label}>
          {options.map(([v, l], i) => (
            <li
              key={v}
              role="option"
              aria-selected={v === value}
              className={`${v === value ? 'on' : ''}${i === active ? ' act' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
