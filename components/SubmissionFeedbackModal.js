'use client';
import { useState } from 'react';
import { FEEDBACK_LABELS } from './SubmissionFeedback';

// Admin: beküldött rejtvény átemelése előtti visszajelzés-ablak. A rejtvény minden
// (kitöltött) részéhez külön szövegdoboz; mindegyik opcionális. Elküldés után kerül a
// titkosírás a sor végére, és a beküldő értesítést kap.
export default function SubmissionFeedbackModal({ submission, onCancel, onSubmit }) {
  const [items, setItems] = useState({});
  const [busy, setBusy] = useState(false);
  const original = {
    clue: submission.clue,
    answer: submission.answer,
    definicio: submission.hints?.definicio,
    indikator: submission.hints?.indikator,
    fodder: submission.hints?.fodder,
    alternativ: submission.hints?.alternativ,
  };
  const parts = Object.keys(FEEDBACK_LABELS).filter((k) => original[k]);

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Visszajelzés a beküldőnek">
        <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em' }}>
          Visszajelzés a beküldőnek
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: -6 }}>
          {submission.name && submission.name !== 'Névtelen' ? `${submission.name} ` : 'A beküldő '}
          a Profilom oldalon olvashatja, a te neveddel. Bármelyik doboz üresen hagyható. Elküldés
          után a titkosírás a sor végére kerül.
        </p>
        {parts.map((k) => (
          <div key={k} className="feedback-part">
            <label className="field-label" htmlFor={`fb-${k}`}>{FEEDBACK_LABELS[k]}</label>
            <div className="feedback-original">{original[k]}</div>
            <textarea
              id={`fb-${k}`}
              value={items[k] || ''}
              maxLength={1000}
              placeholder="Visszajelzés ehhez a részhez (opcionális)…"
              onChange={(e) => setItems((prev) => ({ ...prev, [k]: e.target.value }))}
            />
          </div>
        ))}
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="ghost" type="button" onClick={onCancel} disabled={busy}>
            Mégse
          </button>
          <button
            className="primary"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSubmit(items);
              setBusy(false);
            }}
          >
            {busy ? 'Küldés…' : 'Visszajelzés küldése és sorba állítás'}
          </button>
        </div>
      </div>
    </div>
  );
}
