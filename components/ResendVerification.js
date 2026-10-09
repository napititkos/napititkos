'use client';
import { useState } from 'react';

// "Új visszaigazoló email küldése" gomb a bejelentkezett, de még meg nem erősített fiókoknak.
// (A regisztráció után a fiók csak a megerősítéskor jön létre; ilyen fiók főleg a megerősítés
// bevezetése előtt regisztráltaknál fordul elő.)
export default function ResendVerification({ text }) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  return (
    <div className="resend-verification">
      <p style={{ fontSize: 14, marginTop: 0 }}>
        {text || 'Ehhez meg kell erősítened az e-mail-címedet. Ha nem találod a megerősítő levelet, kérhetsz újat:'}
      </p>
      <button
        className="primary small"
        type="button"
        disabled={sending}
        onClick={async () => {
          setSending(true);
          setMsg(null);
          const res = await fetch('/api/auth/resend-verification', { method: 'POST' }).catch(() => null);
          setSending(false);
          setMsg(
            res?.ok
              ? { ok: true, msg: 'Elküldtük az új visszaigazoló linket! Nézd meg a postaládádat (a spam mappát is).' }
              : { ok: false, msg: 'Nem sikerült elküldeni. Próbáld újra kicsit később.' }
          );
        }}
      >
        {sending ? 'Küldés…' : 'Új visszaigazoló email küldése'}
      </button>
      {msg && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 12 }}>
          {msg.msg}
        </div>
      )}
    </div>
  );
}
