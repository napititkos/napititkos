'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress, saveProgress, mergeProgress, setProgressSyncEnabled, dropGuestEntry } from '../lib/progress';
import { todayStr } from '../lib/date';
import {
  loadTutorialProgress,
  saveTutorialProgress,
  mergeTutorialProgress,
  setTutorialSyncEnabled,
} from '../lib/tutorial';

export default function ProgressSync() {
  const { status } = useSession();
  const didSync = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      didSync.current = false;
      setProgressSyncEnabled(false);
      setTutorialSyncEnabled(false);
      return;
    }
    if (status !== 'authenticated' || didSync.current) return;
    didSync.current = true;

    (async () => {
      try {
        const res = await fetch('/api/account/progress');
        const data = await res.json();
        const local = loadProgress();
        // A bejelentkezés előtt, vendégként megfejtett mai titkosírás nem kerül át a
        // fiókba: visszavonjuk, hogy a fiókkal újra meg lehessen fejteni.
        dropGuestEntry(local, todayStr());
        const merged = mergeProgress(local, data.progress);
        saveProgress(merged);
        setProgressSyncEnabled(true);
        fetch('/api/account/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        }).catch(() => {});
      } catch {}

      try {
        const res = await fetch('/api/account/tutorial');
        const data = await res.json();
        const local = loadTutorialProgress();
        const merged = mergeTutorialProgress(local, data.progress);
        saveTutorialProgress(merged);
        setTutorialSyncEnabled(true);
        fetch('/api/account/tutorial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        }).catch(() => {});
      } catch {}
    })();
  }, [status]);

  return null;
}
