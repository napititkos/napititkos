'use client';
import { useEffect, useState } from 'react';
import PasswordChange from '../../components/PasswordChange';
import { loadProgress, solvedCount } from '../../lib/progress';
import { ACHIEVEMENTS } from '../../lib/achievements';
import { enumerationFor } from '../../lib/format';
import { signOut, useSession } from 'next-auth/react';

// Idő mm:ss formában (a statisztikákhoz).
function formatTimeMs(ms) {
  if (ms == null) return '–';
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [prog, setProg] = useState(null);
  const [mySubmissions, setMySubmissions] = useState(null);

  // Saját közösségi titkosírás törlése (visszakérdezéssel); az értékelései és reakciói is törlődnek.
  async function deleteMySubmission(sub) {
    if (!confirm(`Biztosan törlöd ezt a titkosírásodat?\n\n„${sub.clue}”\n\nAz értékelései és a reakciói is törlődnek, és nem vonható vissza.`)) return;
    const res = await fetch(`/api/community/${encodeURIComponent(sub.id)}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setMySubmissions((prev) => prev.filter((x) => x.id !== sub.id));
    else alert('Nem sikerült törölni. Próbáld újra később.');
  }

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
          A profilod megtekintéséhez <a href="/login" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>jelentkezz be</a>.
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="page-title-row">
        <h1 className="page-title">Profilom{session.user.name ? ` – ${session.user.name}` : ''}</h1>
        <a href="/" className="back-home-btn"><svg className="back-arrow" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7.5 3.5 3 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> Főoldal</a>
      </div>
      {/* Sorrend: közösségi titkosírásaim, statisztikáim, fiókadatok (név, e-mail, jelszó),
          adataim (letöltés, törlés) - mind külön dobozban. */}
      <div className="card">
        <div className="help-block" style={{ marginBottom: 0 }}>
          <h3>Közösségi titkosírásaim {mySubmissions ? `(${mySubmissions.length})` : ''}</h3>
          {mySubmissions === null && <p style={{ color: 'var(--ink-soft)' }}>Betöltés…</p>}
          {mySubmissions && mySubmissions.length === 0 && (
            <p style={{ color: 'var(--ink-soft)' }}>
              Még nem küldtél be titkosírást.{' '}
              <a href="/submit" style={{ color: 'var(--accent-text)' }}>
                Írj egyet!
              </a>
            </p>
          )}
          {mySubmissions &&
            mySubmissions.map((sub) => (
              <div className="sub-item my-sub" key={sub.id}>
                <div className="my-sub-main">
                  <span>
                    {sub.clue} {enumerationFor(sub.answer)}
                  </span>
                  <span className="my-sub-meta">
                    {sub.avg != null ? `★ ${sub.avg.toLocaleString('hu-HU')} (${sub.ratingCount} értékelés)` : 'Még nincs értékelés'}
                    {sub.reactionCount > 0 ? ` · ${sub.reactionCount} reakció` : ''}
                    {sub.promoted ? (sub.shownDate ? ` · napi titkosírás volt: ${sub.shownDate}` : ' · bekerült a napi titkosírások közé') : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="ghost small"
                  aria-label={`Törlés: ${sub.clue}`}
                  onClick={() => deleteMySubmission(sub)}
                >
                  Törlés
                </button>
              </div>
            ))}
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
                <b>{solvedCount(prog)}</b>
                <span>megoldott</span>
              </div>
              <div className="stat">
                <b>{prog.noHintSolves || 0}</b>
                <span>tipp nélkül</span>
              </div>
              <div className="stat">
                <b>{formatTimeMs(prog.fastestTime)}</b>
                <span>leggyorsabb idő</span>
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
          <button className="ghost" type="button" onClick={() => window.dispatchEvent(new Event('open-achievements'))}>
            Trófeák megtekintése
          </button>
        </div>
      </div>

      <div className="card">
        <div className="help-block">
          <h3>Fiókom</h3>
          <p style={{ margin: 0 }}>
            <b>{session.user.name || 'Névtelen'}</b>
            <br />
            {session.user.email}
          </p>
        </div>
        <PasswordChange email={session.user.email} embedded />
      </div>

      <div className="card">
        <div className="help-block">
          <h3>Adataim letöltése</h3>
          <p>A fiókodhoz tartozó összes adatot (fiók, haladás, beküldéseid, értékeléseid, értesítéseid) egy JSON fájlban letöltheted.</p>
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
