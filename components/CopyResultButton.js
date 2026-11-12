'use client';
import { useState } from 'react';

// „Eredmény másolása”: az eredmény szövege a vágólapra kerül (a megosztás helyett, hogy bárhová be
// lehessen illeszteni).
export default function CopyResultButton({ text, label = 'Eredmény másolása' }) {
  const [msg, setMsg] = useState('');
  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch {}
    }
    setMsg(ok ? 'Vágólapra másolva!' : 'Nem sikerült másolni.');
    setTimeout(() => setMsg(''), 2200);
  }
  return (
    <span className="share-wrap">
      <button type="button" className="primary small share-btn" onClick={copy}>
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="5" y="5" width="8.5" height="9.5" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 3.2V2.8A1.3 1.3 0 0 0 9.2 1.5H3.8a1.3 1.3 0 0 0-1.3 1.3v7.4a1.3 1.3 0 0 0 1.3 1.3h.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
