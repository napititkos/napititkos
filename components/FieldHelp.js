'use client';
import { useEffect, useId, useRef, useState } from 'react';

// Kis kérdőjel egy körben a beviteli mezők címkéje mellett, mellette rövid magyarázó szövegdoboz.
export default function FieldHelp({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  // Egérrel: a kérdőjel fölé víve jelenik meg (kattintás nem kell), onnan elvíve eltűnik.
  // Billentyűzettel: fókuszra jelenik meg. Érintőképernyőn (ahol nincs "fölé vitel")
  // koppintásra nyílik, és mellé koppintva bezárul.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span
      className="field-help"
      ref={ref}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        className="field-help-btn"
        aria-label={`Segítség: ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onPointerUp={(e) => {
          if (e.pointerType === 'touch') setOpen((o) => !o);
        }}
        onClick={(e) => e.preventDefault()}
      >
        ?
      </button>
      {open && (
        <span className="field-help-pop" id={id} role="tooltip">
          {children}
        </span>
      )}
    </span>
  );
}
