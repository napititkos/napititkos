'use client';
import { useState } from 'react';

export const FEEDBACK_LABELS = {
  clue: 'Rejtvény',
  answer: 'Megoldás',
  definicio: 'Definíció',
  indikator: 'Mutató',
  fodder: 'Készlet',
  alternativ: 'Alternatív rejtvény',
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

// Az elfogadott beküldéshez kapott visszajelzés (vagy az elutasítás indoklása: feedback.text)
// a Profilomban, lenyitható formában.
export default function SubmissionFeedback({ feedback, title = 'Visszajelzés' }) {
  const [open, setOpen] = useState(false);
  const parts = Object.keys(FEEDBACK_LABELS).filter((k) => feedback.items?.[k]);
  return (
    <div className="sub-feedback">
      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} {title}{feedback.by ? ` (${feedback.by})` : ''}
      </button>
      {open && (
        <div className="sub-feedback-body">
          {feedback.text ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{feedback.text}</p>
          ) : parts.length === 0 ? (
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
