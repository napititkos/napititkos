'use client';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function deleteAccount() {
    const sure = window.confirm(
      'Biztosan törlöd a fiókodat? A haladásod, a trófeáid és a ranglista-bejegyzéseid véglegesen törlődnek. Ez nem visszavonható.'
    );
    if (!sure) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) throw new Error('delete-failed');
      await signOut({ callbackUrl: '/' });
    } catch {
      setBusy(false);
      setMsg({ ok: false, text: 'Nem sikerült törölni a fiókot. Próbáld újra később, vagy írj nekünk.' });
    }
  }

  if (status === 'loading') {
    return (
      <div className="wrap">
        <div className="card">Betöltés…</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="wrap">
        <h1 className="page-title">Fiókom és adataim</h1>
        <div className="card">
          A fiókod kezeléséhez <a href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>jelentkezz be</a>.
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Fiókom és adataim</h1>
      <div className="card">
        <div className="help-block">
          <h3>Bejelentkezve</h3>
          <p>
            {session.user.name ? <b>{session.user.name}</b> : null} {session.user.email}
          </p>
        </div>
        <div className="help-block">
          <h3>Adataim letöltése</h3>
          <p>A fiókodhoz tartozó összes adatot (fiók, haladás, beküldéseid) egy JSON fájlban letöltheted.</p>
          <a href="/api/account/export" style={{ textDecoration: 'none' }}>
            <button className="ghost" type="button">Adataim letöltése</button>
          </a>
        </div>
        <div className="help-block">
          <h3>Fiók törlése</h3>
          <p>
            A fiókod, a haladásod és a ranglista-bejegyzéseid véglegesen törlődnek. A beküldött és már
            közzétett rejtvényeid szövege megmarad, de a nevedet és az e-mail-címedet eltávolítjuk mellőlük.
          </p>
          <button className="primary" type="button" onClick={deleteAccount} disabled={busy}>
            {busy ? 'Törlés…' : 'Fiók végleges törlése'}
          </button>
        </div>
        {msg && (
          <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 14 }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
