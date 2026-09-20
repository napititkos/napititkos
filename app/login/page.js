'use client';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error === 'expired') {
      setStatus({ ok: false, msg: 'A belépő link lejárt vagy már felhasználtad. Kérj egy újat.' });
    } else if (error === 'missing_token') {
      setStatus({ ok: false, msg: 'Hiányzó vagy hibás belépő link.' });
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, msg: 'Elküldtük a belépő linket! Nézd meg az email fiókodat (a spam mappát is).' });
      } else {
        setStatus({ ok: false, msg: data.error || 'Nem sikerült elküldeni a linket.' });
      }
    } catch (err) {
      setStatus({ ok: false, msg: `Hiba történt: ${err.message}` });
    }
    setSending(false);
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Bejelentkezés</h1>
      <div className="card">
        <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', marginTop: 0 }}>
          Nincs jelszó - add meg az email címed, és küldünk egy belépő linket.
        </p>
        <form onSubmit={submit}>
          <label className="field-label">Email cím</label>
          <input
            type="email"
            style={{ textTransform: 'none' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nev@pelda.hu"
            required
          />
          <div style={{ marginTop: 16 }}>
            <button className="primary" type="submit" disabled={sending}>
              {sending ? 'Küldés…' : 'Belépő link kérése'}
            </button>
          </div>
        </form>
        {status && (
          <div className={`feedback ${status.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 14 }}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
