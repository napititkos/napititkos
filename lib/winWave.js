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
    const ms = steps * WAVE_STEP_MS + 2 * WAVE_MS + 100;
    t.current = setTimeout(() => setOn(false), ms);
    // A hullám ideje alatt villog a „Következő játék” gomb is (lásd useWaveBlink).
    if (typeof window !== 'undefined') {
      window.__winWaveUntil = Date.now() + ms;
      window.dispatchEvent(new CustomEvent('win-wave', { detail: { ms } }));
    }
  }, []);
  useEffect(() => () => clearTimeout(t.current), []);
  return [on, play];
}
// Igaz, amíg egy megfejtési hullám tart (akkor is, ha a komponens a hullám indulása után jelent meg,
// pl. a megfejtés után előbukkanó „Következő játék” gomb).
export function useWaveBlink() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let t = 0;
    const start = (ms) => {
      clearTimeout(t);
      setOn(true);
      t = setTimeout(() => setOn(false), ms);
    };
    const left = (window.__winWaveUntil || 0) - Date.now();
    if (left > 0) start(left);
    const on = (e) => start(e.detail?.ms || 2000);
    window.addEventListener('win-wave', on);
    return () => {
      clearTimeout(t);
      window.removeEventListener('win-wave', on);
    };
  }, []);
  return on;
}
// Átlóindex a bal alsó sarokból: a bal alsó csempe 0, a jobb felső a legnagyobb.
export const diagFromBottomLeft = (r, c, rows) => rows - 1 - r + c;
