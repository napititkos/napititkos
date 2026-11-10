'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import SzoGame from '../../components/SzoGame';
import GameBar from '../../components/GameBar';
import GameFooter from '../../components/GameFooter';
import { deviceId } from '../../lib/device';

// A napi szókereső oldala (csak élesítés után).
export default function SzokeresoPage() {
  const { status } = useSession();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (status === 'loading') return;
    const dev = deviceId();
    fetch(`/api/szo${dev ? `?device=${dev}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ live: false }));
  }, [status]);
  return (
    <div className="wrap">
      <GameBar game="szo" />
      <h1 className="sr-only">Szókereső</h1>
      <div className="card">
        {!data ? (
          <p>Betöltés…</p>
        ) : !data.live || !data.grid ? (
          <p>A napi szókereső hamarosan érkezik.</p>
        ) : (
          <>
            <SzoGame key={data.date} data={data} />
          </>
        )}
      </div>
      <GameFooter game="szo" />
    </div>
  );
}
