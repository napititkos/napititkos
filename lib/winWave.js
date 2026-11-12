'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Megfejtéskor végigfutó „hullám” a rejtvény csempéin (két kör): a csempe kivilágosodik és kicsit
// előreugrik. A rácsoknál a bal alsó sarokból a jobb felső felé, átlónként (a szomszédos átlók
// átfedve), a titkosírás sorában balról jobbra. A CSS a --d (átló vagy sorszám) változóból számolja
// a késleltetést; ez a hook csak a lejátszás idejére teszi rá a „win-wave” osztályt.
export const WAVE_STEP_MS = 80;
export const WAVE_MS = 620;
export function useWinWave() {
  const [on, setOn] = useState(false);
  const t = useRef(0);
  const play = useCallback((steps) => {
    clearTimeout(t.current);
    setOn(true);
    t.current = setTimeout(() => setOn(false), steps * WAVE_STEP_MS + 2 * WAVE_MS + 100);
  }, []);
  useEffect(() => () => clearTimeout(t.current), []);
  return [on, play];
}
// Átlóindex a bal alsó sarokból: a bal alsó csempe 0, a jobb felső a legnagyobb.
export const diagFromBottomLeft = (r, c, rows) => rows - 1 - r + c;
