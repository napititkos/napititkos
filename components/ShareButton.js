'use client';
import { useState } from 'react';

// „Megosztom” gomb a két új játékhoz: ahol a böngésző ismeri a rendszer megosztó felületét
// (mobilon szinte mindenhol, asztalon pl. Windows és macOS alatt is), azt hozza fel; ahol nem,
// ott vágólapra másol, és ezt jelzi.
export default function ShareButton({ text, label = 'Megosztom' }) {
  const [msg, setMsg] = useState('');
  async function share() {
    const url = (text.match(/https?:\/\/\S+/) || [])[0];
    const body = url ? text.replace(url, '').trim() : text;
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ text: body, url }))) {
        await navigator.share({ text: body, ...(url ? { url } : {}) });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // a felhasználó bezárta a megosztó felületet
    }
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Vágólapra másolva!');
    } catch {
      setMsg('Nem sikerült megosztani.');
    }
    setTimeout(() => setMsg(''), 2200);
  }
  return (
    <span className="share-wrap">
      <button type="button" className="primary small share-btn" onClick={share}>
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 10.5V2M4.8 5 8 1.8 11.2 5M3 8.5v4.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>{' '}
        {label}
      </button>
      {msg && (
        <span className="share-msg" role="status">
          {msg}
        </span>
      )}
    </span>
  );
}
