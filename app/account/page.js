'use client';
import { useEffect, useState } from 'react';
import { loadProgress } from '../../lib/progress';
import { ACHIEVEMENTS } from '../../lib/achievements';
import { enumerationFor } from '../../lib/format';
import { signOut, useSession } from 'next-auth/react';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [prog, setProg] = useState(null);
  const [mySubmissions, setMySubmissions] = useState(null);

  useEffect(() => {
    setProg(loadProgress());
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/account/my-submissions')
      .then((r) => r.json())
      .then((d) => setMySubmissions(d.submissions || []))
      .catch(() => setMySubmissions([]));
  }, [session?.user?.id]);

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
        <h1 className="page-title">Profilom</h1>
        <div className="card">
          A profilod megtekintéséhez <a href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>jelentkezz be</a>.
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Profilom</h1>
      <div className="card">
        <div className="help-block" style={{ marginBottom: 0 }}>
          <h3>{session.user.name || 'Névtelen'}</h3>
          <p style={{ margin: 0 }}>{session.user.email}</p>
        </div>
      </div>

      <div className="card">
        <div className="help-block" style={{ marginBottom: 0 }}>
          <h3>Statisztikáim</h3>
          {prog && (
            <div className="stats" style={{ justifyContent: 'flex-start', gap: 18, margin: '10px 0 14px' }}>
              <div className="stat">
                <b>{prog.streak}</b>
                <span>napos sorozat</span>
              </div>
              <div className="stat">
                <b>{prog.best}</b>
                <span>legjobb sorozat</span>
              </div>
              <div className="stat">
                <b>{prog.totalSolved || 0}</b>
                <span>megoldott</span>
              </div>
              <a
                href="#"
                className="stat-link"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new Event('open-achievements'));
                }}
              >
                <b>
                  {(prog.unlocked || []).length}/{ACHIEVEMENTS.length}
                </b>
                <span>trófea</span>
              </a>
            </div>
          )}
          <a href="/stats" style={{ textDecoration: 'none' }}>
            <button className="ghost" type="button">Részletes statisztikák</button>
          </a>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-baloo), "Baloo 2", sans-serif', color: 'var(--accent)', fontSize: 21, margin: '6px 0 12px', letterSpacing: '0.015em' }}>Adataim</h2>
      <div className="card">
        <div className="help-block">
          <h3>Elfogadott beküldéseim {mySubmissions ? `(${mySubmissions.length})` : ''}</h3>
          {mySubmissions === null && <p style={{ color: 'var(--ink-soft)' }}>Betöltés…</p>}
          {mySubmissions && mySubmissions.length === 0 && (
            <p style={{ color: 'var(--ink-soft)' }}>
              Még egy beküldésed sem került be a napi titkosírások közé.{' '}
              <a href="/submit" style={{ color: 'var(--accent)' }}>
                Küldj be egyet!
              </a>
            </p>
          )}
          {mySubmissions &&
            mySubmissions.map((sub) => (
              <div className="sub-item" key={sub.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>
                    {sub.clue} {enumerationFor(sub.answer)}
                  </span>
                  <span style={{ fontSize: 12.5, color: sub.shownDate ? 'var(--good)' : 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                    {sub.shownDate ? `✓ ${sub.shownDate}` : 'beütemezve'}
                  </span>
                </div>
              </div>
            ))}
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

      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 18px' }}>
        <button className="ghost" type="button" onClick={() => signOut({ callbackUrl: '/' })}>
          Kijelentkezés
        </button>
      </div>
    </div>
  );
}
