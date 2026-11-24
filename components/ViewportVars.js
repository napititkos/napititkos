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
    // Csak a valódi (szövegmezőhöz nyíló) billentyűzetet vesszük figyelembe: a böngésző címsorának
    // ki-be csúszása (pl. görgetéskor, vagy amikor az oldal rövidebb lesz) ne mozgassa a lenti
    // értesítéseket (különben pl. egy trófea felugrója beúszás közben megugrik).
    const update = () => {
      const a = document.activeElement;
      const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
      const hidden = Math.max(0, Math.round(window.innerHeight - (vv.offsetTop + vv.height)));
      root.style.setProperty('--kb-offset', `${typing && hidden >= 150 ? hidden : 0}px`);
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
