'use client';
import { useState } from 'react';

// Admin: beküldés elutasítása (törlése) opcionális indoklással. Ha az indoklás üres, a
// beküldés csak törlődik (a beküldő nem kap értesítést, és a Profilomban sem jelenik meg semmi).
export default function SubmissionRejectModal({ submission, onCancel, onSubmit }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Beküldés elutasítása">
        <h2 style={{ fontFamily: 'var(--font-baloo), Baloo 2, sans-serif', color: 'var(--accent-text)', marginTop: 0, letterSpacing: '0.015em' }}>
          Beküldés elutasítása
        </h2>
        <div className="feedback-original">{submission.clue}</div>
        <label className="field-label" htmlFor="reject-reason">Indoklás a beküldőnek (opcionális)</label>
        <textarea
          id="reject-reason"
          value={reason}
          maxLength={2000}
          placeholder="Miért nem került be a rejtvény? Ha üresen hagyod, a beküldő nem kap értesítést."
          onChange={(e) => setReason(e.target.value)}
        />
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 0 }}>
          {reason.trim()
            ? 'A beküldő értesítést kap, és a Profilomban a te neveddel olvashatja az indoklást.'
            : 'Indoklás nélkül a beküldés csak törlődik, a beküldő nem kap értesítést.'}
        </p>
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
              await onSubmit(reason.trim());
              setBusy(false);
            }}
          >
            {busy ? 'Törlés…' : reason.trim() ? 'Elutasítás és indoklás küldése' : 'Törlés indoklás nélkül'}
          </button>
        </div>
      </div>
    </div>
  );
}
