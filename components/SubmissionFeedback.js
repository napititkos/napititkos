'use client';
import { useState } from 'react';

export const FEEDBACK_LABELS = {
  clue: 'Rejtvény',
  answer: 'Megoldás',
  definicio: 'Definíció',
  indikator: 'Mutató',
  fodder: 'Készlet',
  alternativ: 'Alternatív tipp',
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

// Az elfogadott beküldéshez kapott visszajelzés a Profilomban (lenyitható).
export default function SubmissionFeedback({ feedback }) {
  const [open, setOpen] = useState(false);
  const parts = Object.keys(FEEDBACK_LABELS).filter((k) => feedback.items?.[k]);
  return (
    <div className="sub-feedback">
      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} Visszajelzés{feedback.by ? ` (${feedback.by})` : ''}
      </button>
      {open && (
        <div className="sub-feedback-body">
          {parts.length === 0 ? (
            <p>Elfogadtuk a rejtvényedet, külön megjegyzés nélkül. Köszönjük!</p>
          ) : (
            parts.map((k) => (
              <div key={k} className="sub-feedback-item">
                <b>{FEEDBACK_LABELS[k]}:</b> {feedback.items[k]}
              </div>
            ))
          )}
          <div className="sub-feedback-meta">
            {feedback.by ? `${feedback.by} · ` : ''}
            {formatDate(feedback.at)}
          </div>
        </div>
      )}
    </div>
  );
}
