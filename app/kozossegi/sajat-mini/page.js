'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import UserMiniEditor from '../../../components/UserMiniEditor';

// Saját mini keresztrejtvény készítése (csak élesítés után, bejelentkezve, megerősített fiókkal).
export default function SajatMiniPage() {
  const { data: session, status } = useSession();
  const [live, setLive] = useState(null);
  const [doneId, setDoneId] = useState(null);
  useEffect(() => {
    fetch('/api/mini/status')
      .then((r) => r.json())
      .then((d) => setLive(!!d.live))
      .catch(() => setLive(false));
  }, []);
  const back = (
    <a href="/kozossegi?tab=mini" className="back-home-btn">
      <svg className="back-arrow" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7.5 3.5 3 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> Vissza
    </a>
  );
  return (
    <div className="wrap">
      <div className="page-title-row">
        <h1 className="page-title">Saját mini készítése</h1>
        {back}
      </div>
      <div className="card">
        {live === null || status === 'loading' ? (
          <p>Betöltés…</p>
        ) : !live ? (
          <p>A mini keresztrejtvény hamarosan érkezik.</p>
        ) : !session?.user ? (
          <p>
            A saját mini beküldéséhez <a href="/login?callbackUrl=/kozossegi/sajat-mini">jelentkezz be</a>.
          </p>
        ) : session.user.verified === false ? (
          <p>A beküldéshez meg kell erősítened az e-mail-címedet.</p>
        ) : doneId ? (
          <p className="feedback good" style={{ marginLeft: 0 }}>
            Köszönjük! A minid felkerült a Közösségi rejtvények közé. <a href="/kozossegi?tab=mini">Megnézem →</a>
          </p>
        ) : (
          <UserMiniEditor onDone={setDoneId} />
        )}
      </div>
    </div>
  );
}
