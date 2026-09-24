'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

function formatTs(ts) {
  try {
    return new Date(ts).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Kommentlista egy adott napra. readOnly esetén (archívum) nincs beviteli mező.
export default function Comments({ date, readOnly = false, onCountChange }) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/comments?date=${date}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => setComments([]));
  }, [date, status]);

  useEffect(() => {
    if (comments && onCountChange) onCountChange(comments.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setComments((prev) => [...(prev || []), data.comment]);
        setText('');
      } else if (data.error === 'unverified') {
        setError('Kommenteléshez erősítsd meg az e-mail-címedet.');
      } else if (res.status === 429) {
        setError('Túl sok komment rövid idő alatt - próbáld újra később.');
      } else {
        setError('Nem sikerült elküldeni.');
      }
    } catch {
      setError('Nem sikerült elküldeni.');
    }
    setSending(false);
  }

  async function remove(id) {
    if (!confirm('Biztosan törlöd ezt a kommentet?')) return;
    const res = await fetch(`/api/comments?date=${date}&id=${id}`, { method: 'DELETE' });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
  }

  if (status === 'loading') return <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Betöltés…</p>;

  if (!session?.user) {
    return (
      <p style={{ fontSize: 14, margin: 0 }}>
        A kommentek olvasásához és írásához{' '}
        <a href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          jelentkezz be
        </a>
        .
      </p>
    );
  }

  return (
    <div>
      {comments === null && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Betöltés…</p>}
      {comments && comments.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 0 }}>
          {readOnly ? 'Ehhez a titkosíráshoz nem érkezett komment.' : 'Még nincs komment - légy te az első!'}
        </p>
      )}
      {comments && comments.length > 0 && (
        <div className="comment-list">
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <div className="comment-head">
                <b>{c.name}</b>
                <span>{formatTs(c.ts)}</span>
                {(c.mine || isAdmin) && (
                  <button className="comment-del" onClick={() => remove(c.id)} title="Törlés">
                    ✕
                  </button>
                )}
              </div>
              <div className="comment-text">{c.text}</div>
            </div>
          ))}
        </div>
      )}
      {!readOnly && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Kommentelés mint ${session.user.name || 'Névtelen'}…`}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{text.length}/500</span>
            <button className="primary small" disabled={sending || !text.trim()} onClick={send}>
              {sending ? 'Küldés…' : 'Küldés'}
            </button>
          </div>
          {error && (
            <div className="feedback hint" style={{ marginLeft: 0, marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
