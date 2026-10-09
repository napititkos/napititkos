'use client';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

// Jelszó módosítása a Profilom oldalon. Jelszó nélküli (Google / belépő link) fióknál a
// jelszót e-mailben küldött linkkel lehet beállítani.
export default function PasswordChange({ email }) {
  const [hasPassword, setHasPassword] = useState(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/account/password', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setHasPassword(!!d.hasPassword))
      .catch(() => setHasPassword(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (next.length < 8) return setMsg({ ok: false, msg: 'Az új jelszónak legalább 8 karakteresnek kell lennie.' });
    if (next !== next2) return setMsg({ ok: false, msg: 'A két új jelszó nem egyezik.' });
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next, newPassword2: next2 }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      // A csere a többi eszközön kiléptet; ezen az eszközön az új jelszóval újra belépünk.
      await signIn('credentials', { email, password: next, redirect: false }).catch(() => {});
      setCurrent('');
      setNext('');
      setNext2('');
      setOpen(false);
      setMsg({ ok: true, msg: 'Kész, megváltoztattuk a jelszavadat. A többi eszközödön újra be kell lépned.' });
    } else if (res?.status === 429) {
      setMsg({ ok: false, msg: 'Túl sok próbálkozás. Próbáld újra később.' });
    } else {
      setMsg({ ok: false, msg: data.message || 'Nem sikerült megváltoztatni a jelszót.' });
    }
    setBusy(false);
  }

  async function sendSetLink() {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setBusy(false);
    setMsg(
      res?.ok
        ? { ok: true, msg: 'Elküldtük a jelszóbeállító linket az e-mail-címedre (a spam mappát is nézd meg). A link 1 óráig érvényes.' }
        : { ok: false, msg: 'Nem sikerült elküldeni. Próbáld újra később.' }
    );
  }

  if (hasPassword === null) return null;

  return (
    <div className="card">
      <div className="help-block" style={{ marginBottom: 0 }}>
        <h3>Jelszó</h3>
        {!hasPassword ? (
          <>
            <p style={{ marginTop: 0 }}>
              A fiókodhoz még nincs jelszó (Google-lal vagy belépő linkkel lépsz be). Ha jelszóval is
              szeretnél belépni, küldünk egy linket, amivel beállíthatod.
            </p>
            <button className="ghost" type="button" disabled={busy} onClick={sendSetLink}>
              {busy ? 'Küldés…' : 'Jelszó beállítása e-mailben'}
            </button>
          </>
        ) : !open ? (
          <button className="ghost" type="button" onClick={() => { setOpen(true); setMsg(null); }}>
            Jelszó módosítása
          </button>
        ) : (
          <form onSubmit={submit}>
            <label className="field-label" htmlFor="pw-current">Jelenlegi jelszó</label>
            <input id="pw-current" className="form-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <label className="field-label" htmlFor="pw-new">Új jelszó (legalább 8 karakter)</label>
            <input id="pw-new" className="form-input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} maxLength={200} />
            <label className="field-label" htmlFor="pw-new2">Új jelszó még egyszer</label>
            <input id="pw-new2" className="form-input" type="password" autoComplete="new-password" value={next2} onChange={(e) => setNext2(e.target.value)} required minLength={8} maxLength={200} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="primary" type="submit" disabled={busy}>
                {busy ? 'Mentés…' : 'Új jelszó mentése'}
              </button>
              <button className="ghost" type="button" onClick={() => { setOpen(false); setMsg(null); }}>
                Mégse
              </button>
            </div>
          </form>
        )}
        {msg && (
          <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 12 }}>
            {msg.msg}
          </div>
        )}
      </div>
    </div>
  );
}
