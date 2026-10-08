'use client';
import { useEffect, useState } from 'react';

// Új jelszó beállítása az e-mailben kapott, egyszer használatos linkkel.
export default function ResetPasswordPage() {
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    // A tokent eltüntetjük a címsorból (ne maradjon az előzményekben, ne kerüljön képernyőképre).
    if (t) window.history.replaceState(null, '', '/reset-password');
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) return setStatus({ ok: false, msg: 'A jelszónak legalább 8 karakteresnek kell lennie.' });
    if (password !== password2) return setStatus({ ok: false, msg: 'A két jelszó nem egyezik.' });
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        setStatus({ ok: true, msg: 'Kész! Beállítottuk az új jelszavadat, most már beléphetsz vele.' });
      } else if (res.status === 429) {
        setStatus({ ok: false, msg: 'Túl sok próbálkozás. Próbáld újra később.' });
      } else {
        setStatus({ ok: false, msg: data.message || 'Nem sikerült beállítani az új jelszót.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Nem sikerült elküldeni. Ellenőrizd az internetkapcsolatot.' });
    }
    setSending(false);
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Új jelszó beállítása</h1>
      <div className="card">
        {token === null ? (
          <p style={{ margin: 0 }}>Betöltés…</p>
        ) : !token ? (
          <p style={{ marginTop: 0 }}>
            Hiányzó vagy hibás link. Új linket a bejelentkezésnél, az „Elfelejtetted a jelszavad?” gombbal kérhetsz.
          </p>
        ) : done ? null : (
          <form onSubmit={submit}>
            <label className="field-label" htmlFor="reset-password">Új jelszó (legalább 8 karakter)</label>
            <input id="reset-password" className="form-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={200} />
            <label className="field-label" htmlFor="reset-password2">Új jelszó még egyszer</label>
            <input id="reset-password2" className="form-input" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required minLength={8} maxLength={200} />
            <div style={{ marginTop: 16 }}>
              <button className="primary" type="submit" disabled={sending}>
                {sending ? 'Mentés…' : 'Új jelszó mentése'}
              </button>
            </div>
          </form>
        )}
        {status && (
          <div className={`feedback ${status.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: token && !done ? 14 : 0 }}>
            {status.msg}
          </div>
        )}
        {(done || token === '') && (
          <div style={{ marginTop: 16 }}>
            <a href="/login" style={{ textDecoration: 'none' }}>
              <button className="primary" type="button">Bejelentkezés</button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
