'use client';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'magic'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get('verify');
    if (verify === 'ok') {
      setStatus({ ok: true, msg: 'Sikeresen megerősítetted az email címed!' });
    } else if (verify === 'expired') {
      setStatus({ ok: false, msg: 'A megerősítő link lejárt vagy már felhasználtad.' });
    } else if (verify === 'missing') {
      setStatus({ ok: false, msg: 'Hiányzó vagy hibás megerősítő link.' });
    }
    const error = params.get('error');
    if (error === 'expired') {
      setStatus({ ok: false, msg: 'A belépő link lejárt vagy már felhasználtad. Kérj egy újat.' });
    } else if (error === 'missing_token') {
      setStatus({ ok: false, msg: 'Hiányzó vagy hibás belépő link.' });
    }
  }, []);

  async function submitLogin(e) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    const res = await signIn('credentials', { email, password, redirect: false });
    setSending(false);
    if (res?.error) {
      setStatus({ ok: false, msg: 'Hibás email cím vagy jelszó.' });
    } else {
      window.location.href = '/';
    }
  }

  async function submitRegister(e) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus({ ok: false, msg: 'A jelszónak legalább 8 karakteresnek kell lennie.' });
      return;
    }
    setSending(true);
    setStatus(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus({ ok: false, msg: data.error || 'Nem sikerült a regisztráció.' });
      setSending(false);
      return;
    }
    const signInRes = await signIn('credentials', { email, password, redirect: false });
    setSending(false);
    if (signInRes?.error) {
      setStatus({ ok: true, msg: 'Sikeres regisztráció! Most már bejelentkezhetsz.' });
      setMode('login');
    } else {
      window.location.href = '/';
    }
  }

  async function submitMagicLink(e) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    const res = await signIn('email', { email, redirect: false });
    setSending(false);
    if (res?.error) {
      setStatus({ ok: false, msg: 'Nem sikerült elküldeni a linket.' });
    } else {
      setStatus({ ok: true, msg: 'Elküldtük a belépő linket! Nézd meg az email fiókodat (a spam mappát is).' });
    }
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Bejelentkezés</h1>
      <div className="card">
        <button
          type="button"
          className="ghost"
          style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}
          onClick={() => signIn('google', { callbackUrl: '/' })}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.36 0-4.36-1.6-5.07-3.74H.9v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.93 10.68A5.4 5.4 0 0 1 3.65 9c0-.58.1-1.15.28-1.68V4.99H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.01l2.97-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.99l3.03 2.33C4.64 5.18 6.64 3.58 9 3.58z" />
          </svg>
          Bejelentkezés Google-lal
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px', color: 'var(--ink-soft)', fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          vagy
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={mode === 'login' ? 'primary small' : 'ghost small'} onClick={() => { setMode('login'); setStatus(null); }}>
            Belépés
          </button>
          <button className={mode === 'register' ? 'primary small' : 'ghost small'} onClick={() => { setMode('register'); setStatus(null); }}>
            Regisztráció
          </button>
          <button className={mode === 'magic' ? 'primary small' : 'ghost small'} onClick={() => { setMode('magic'); setStatus(null); }}>
            Belépő link
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={submitLogin}>
            <label className="field-label">Email cím</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="field-label">Jelszó</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div style={{ marginTop: 16 }}>
              <button className="primary" type="submit" disabled={sending}>
                {sending ? 'Belépés…' : 'Belépés'}
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={submitRegister}>
            <label className="field-label">Neved (opcionális)</label>
            <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="field-label">Email cím</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="field-label">Jelszó (legalább 8 karakter)</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <div style={{ marginTop: 16 }}>
              <button className="primary" type="submit" disabled={sending}>
                {sending ? 'Regisztráció…' : 'Regisztráció'}
              </button>
            </div>
          </form>
        )}

        {mode === 'magic' && (
          <form onSubmit={submitMagicLink}>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 0 }}>
              Nincs szükséged jelszóra - küldünk egy belépő linket emailben.
            </p>
            <label className="field-label">Email cím</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div style={{ marginTop: 16 }}>
              <button className="primary" type="submit" disabled={sending}>
                {sending ? 'Küldés…' : 'Belépő link kérése'}
              </button>
            </div>
          </form>
        )}

        {status && (
          <div className={`feedback ${status.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 14 }}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
