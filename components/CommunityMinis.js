'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import MiniPlayer from './MiniPlayer';
import MiniThumb from './MiniThumb';
import DailyReactions from './DailyReactions';
import Icon from './Icon';

// Közösségi rejtvények – Minik: a játékosok által készített mini keresztrejtvények. Megfejteni
// bejelentkezve lehet; megfejtés után kitöltött az előnézet, és reagálni is lehet. A beküldő és
// az admin törölheti, az admin beemelheti a heti várólistára.
function day(iso) {
  try {
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}
function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function CommunityMinis() {
  const { status } = useSession();
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState(null);

  function load() {
    fetch('/api/community/minis', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ items: [] }));
  }
  useEffect(() => {
    if (status !== 'loading') load();
  }, [status]);

  async function solved(it, elapsed) {
    setData((d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, solvedMs: elapsed, solvers: x.solvers + (x.solvedMs == null ? 1 : 0) } : x)) }));
    try {
      await fetch(`/api/community/minis/${it.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'solve', elapsed }) });
    } catch {}
  }
  async function remove(it) {
    if (!confirm('Biztosan törlöd ezt a minit?')) return;
    const r = await fetch(`/api/community/minis/${it.id}`, { method: 'DELETE' });
    setMsg(r.ok ? { ok: true, text: 'A mini törölve.' } : { ok: false, text: 'Nem sikerült törölni.' });
    load();
  }
  async function promote(it) {
    if (!confirm('Beemeled ezt a minit a heti várólistára? A kérdései a kérdésbankba is bekerülnek.')) return;
    const r = await fetch(`/api/community/minis/${it.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'promote' }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? { ok: true, text: 'Beemelve a heti várólistára.' } : { ok: false, text: d.message || 'Nem sikerült beemelni.' });
    load();
  }

  const loggedIn = status === 'authenticated';
  return (
    <>
      <a className="community-cta" href="/kozossegi/sajat-mini">
        <Icon src="/icons/Rejtveny_bekuldese.png" size={22} className="icon-on-accent" /> Készíts saját minit!
      </a>
      {msg && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} role="status" style={{ marginLeft: 0, marginBottom: 10 }}>
          {msg.text}
        </div>
      )}
      {!data && <p>Betöltés…</p>}
      {data && data.items.length === 0 && <p className="mini-muted">Még nincs közösségi mini. Legyél te az első!</p>}
      <div className="mini-list">
        {(data?.items || []).map((it) => {
          const open = openId === it.id;
          const done = it.solvedMs != null;
          return (
            <div key={it.id} className={`card mini-list-item${open ? ' open' : ''}`}>
              <button type="button" className="mini-list-head" aria-expanded={open} onClick={() => setOpenId(open ? null : it.id)}>
                <MiniThumb rows={it.rows} filled={done} />
                <span className="mini-list-meta">
                  <b>{it.name}</b>
                  <span>
                    {day(it.createdAt)} · {it.solvers} megfejtő{it.reactionCount ? ` · ${it.reactionCount} reakció` : ''}
                    {done ? ` · megfejtve (${fmt(it.solvedMs)})` : ''}
                    {it.promoted ? ' · bekerült a heti minik közé' : ''}
                  </span>
                </span>
                <span className="mini-list-chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
              </button>
              {open && (
                <div className="mini-list-body">
                  {loggedIn ? (
                    <MiniPlayer key={it.id} rows={it.rows} entries={it.entries} solvedTime={it.solvedMs} onSolved={(t) => solved(it, t)} />
                  ) : (
                    <p>
                      A megfejtéshez <a href="/login?callbackUrl=/kozossegi">jelentkezz be</a>.
                    </p>
                  )}
                  {done && <DailyReactions date={it.id} scope="cmini" interactive />}
                  {(it.isOwner || data.isAdmin) && (
                    <div className="mini-list-actions">
                      {data.isAdmin && !it.promoted && (
                        <button className="primary small" onClick={() => promote(it)}>
                          Beemelés a heti minik közé
                        </button>
                      )}
                      <button className="ghost small danger" onClick={() => remove(it)}>
                        Törlés
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
