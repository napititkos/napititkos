'use client';
import { useEffect } from 'react';

// A mobil billentyűzet által eltakart rész magassága CSS-változóban (--kb-offset). A
// képernyő aljára rögzített elemek (pl. a gombok üzenetei) ezzel a billentyűzet fölé kerülnek
// - különben gépelés közben a billentyűzet mögött lennének. A visualViewport API-t minden
// mai mobilböngésző ismeri; ahol nincs, a változó 0 marad.
export default function ViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const hidden = Math.max(0, Math.round(window.innerHeight - (vv.offsetTop + vv.height)));
      root.style.setProperty('--kb-offset', `${hidden}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return null;
}
