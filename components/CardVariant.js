'use client';
import { useEffect } from 'react';

// Kipróbálható kártya-kiemelés a főoldalon: ?kartya=1 (árnyék), 2 (lila keret), 3 (nyitott
// Nyertél rész). Az eszköz megjegyzi; alapból 1. A döntés után ez a komponens törölhető.
const VARIANTS = ['1', '2', '3'];
export default function CardVariant() {
  useEffect(() => {
    let v = '1';
    try {
      const q = new URLSearchParams(window.location.search).get('kartya');
      if (q && VARIANTS.includes(q)) {
        localStorage.setItem('kartya-valtozat', q);
        v = q;
      } else {
        const saved = localStorage.getItem('kartya-valtozat');
        if (VARIANTS.includes(saved)) v = saved;
      }
    } catch {}
    document.documentElement.dataset.kartya = v;
  }, []);
  return null;
}
