'use client';
import { useEffect, useId, useRef, useState } from 'react';

// Kis kérdőjel egy körben a beviteli mezők címkéje mellett; rákattintva (vagy Enterrel) rövid
// magyarázó szövegdoboz nyílik alatta. Mellé kattintva vagy Esc-re bezárul.
export default function FieldHelp({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span className="field-help" ref={ref}>
      <button
        type="button"
        className="field-help-btn"
        aria-label={`Segítség: ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        ?
      </button>
      {open && (
        <span className="field-help-pop" id={id} role="note">
          {children}
        </span>
      )}
    </span>
  );
}
