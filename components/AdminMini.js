'use client';
import { useEffect, useState } from 'react';
import MiniPlayer from './MiniPlayer';
import MiniEditor from './MiniEditor';
import { N, numbering } from '../lib/miniGrid';

// Admin: mini keresztrejtvény (5x5). A táblák piszkozatként elmenthetők (akkor is, ha még nincs
// minden kérdés kész), bármelyik admin folytathatja őket, és kézzel vagy generálással is
// készülhetnek. A kész tábla a várólistára kerül; hetente, vasárnap éjfélkor (hétfő 00:00) a
// várólista első eleme jelenik meg. Itt van még az új szó felvitele a kérdésbankba.
function MiniGrid({ rows, small = false }) {
  const nums = numbering(rows);
  return (
    <div className={`mini-grid${small ? ' small' : ''}`} role="img" aria-label="Rejtvényrács">
      {rows.map((row, r) =>
        row.map((ch, c) =>
          ch === '#' ? (
            <span key={`${r}-${c}`} className="mini-cell black" />
          ) : (
            <span key={`${r}-${c}`} className="mini-cell">
              {nums[`${r},${c}`] && <span className="mini-num">{nums[`${r},${c}`]}</span>}
              <span className="mini-ch">{(ch || '').toUpperCase()}</span>
            </span>
          )
        )
      )}
    </div>
  );
}

async function api(body) {
  const res = await fetch('/api/admin/mini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function when(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('hu-HU', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminMini() {
  const [state, setState] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [editing, setEditing] = useState(null); // { key, initial }
  const [msg, setMsg] = useState(null);
  const [newWord, setNewWord] = useState({ word: '', clue: '' });
  const [trying, setTrying] = useState(null); // a várólistáról kipróbált rejtvény

  async function load() {
    const [a, b] = await Promise.all([fetch('/api/admin/mini', { cache: 'no-store' }), fetch('/api/admin/mini/drafts', { cache: 'no-store' })]);
    if (a.ok) setState(await a.json());
    if (b.ok) setDrafts((await b.json()).drafts);
  }
  useEffect(() => {
    load();
  }, []);

  const openNew = (extra = {}) =>
    setEditing({ key: `new-${Date.now()}`, initial: { title: '', rows: Array.from({ length: N }, () => Array(N).fill('')), clues: {}, ...extra } });

  async function openDraft(id) {
    setMsg(null);
    const res = await fetch(`/api/admin/mini/drafts?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) {
      setMsg({ ok: false, text: 'Ez a piszkozat már nem létezik.' });
      return load();
    }
    const { draft } = await res.json();
    setEditing({ key: `${draft.id}-${draft.rev}-${Date.now()}`, initial: draft });
  }

  async function deleteDraft(d) {
    if (!confirm(`Biztosan törlöd a(z) „${d.title || 'Névtelen tábla'}” piszkozatot? Ezt nem lehet visszavonni.`)) return;
    const res = await fetch('/api/admin/mini/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: d.id, rev: d.rev }) });
    if (res.status === 409) setMsg({ ok: false, text: `Közben ${(await res.json().catch(() => ({}))).draft?.updatedBy?.name || 'valaki'} módosította, ezért nem töröltem. Nézd meg, és töröld újra, ha biztos vagy benne.` });
    else if (!res.ok && res.status !== 404) setMsg({ ok: false, text: 'Nem sikerült törölni.' });
    else setMsg({ ok: true, text: 'A piszkozat törölve.' });
    load();
  }

  async function addWord() {
    const { ok, data } = await api({ action: 'addWord', word: newWord.word, clue: newWord.clue });
    if (!ok) return setMsg({ ok: false, text: data.message || 'Nem sikerült felvinni.' });
    setMsg({ ok: true, text: `A(z) „${data.word.toUpperCase()}” bekerült a bankba (${data.variants} kérdésváltozat).` });
    setNewWord({ word: '', clue: '' });
    load();
  }

  async function removeQueued(id) {
    if (!confirm('Biztosan törlöd ezt a rejtvényt a várólistáról?')) return;
    await api({ action: 'removeQueued', id });
    load();
  }

  return (
    <>
      <div className="card">
        <b>Áttekintés</b>
        {!state ? (
          <p style={{ color: 'var(--ink-soft)' }}>Betöltés…</p>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 0 }}>
            Piszkozat: <b>{drafts ? drafts.length : '…'}</b> · Várólista: <b>{state.queue.length}</b> rejtvény · Bank: <b>{state.bankWords}</b> szó kézi kérdéssel, <b>{state.titkosWords}</b> szó
            titkosírásból · Kizárt szavak: <b>{state.excluded}</b>
            <br />
            {state.start ? (
              <>
                Új rejtvény hetente, vasárnap éjfélkor (hétfő 00:00) kerül ki a várólista elejéről, a(z) {state.start} kezdetű héttől.{' '}
                {state.current ? `Az aktuális a ${state.current.week} kezdetű hété.` : 'Még nem jelent meg rejtvény.'}
              </>
            ) : (
              <>A megjelenés még nincs elindítva: a várólista egyelőre csak gyűlik, rejtvény nem kerül ki.</>
            )}
          </p>
        )}
      </div>

      {msg && !editing && (
        <div className={`feedback ${msg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0 }} role="status">
          {msg.text}
        </div>
      )}

      {editing ? (
        <MiniEditor
          key={editing.key}
          initial={editing.initial}
          onChanged={load}
          onClose={(reason) => {
            setEditing(null);
            if (reason === 'published') setMsg({ ok: true, text: 'Beemelve a várólistára. Az új vagy átírt kérdések bekerültek a bankba.' });
            load();
          }}
        />
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b>Piszkozatok{drafts ? ` (${drafts.length})` : ''}</b>
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="primary" onClick={() => openNew()}>
                Új üres tábla
              </button>
              <button className="ghost" onClick={() => openNew({ autoTemplate: true })}>
                Véletlen mintával
              </button>
              <button className="ghost" onClick={() => openNew({ autoGenerate: true })}>
                Generált tábla
              </button>
            </span>
          </div>
          <p className="mini-muted" style={{ marginTop: 8 }}>
            A táblát bármikor elmentheted, akkor is, ha még nincs minden szó és kérdés kész. A piszkozatot bármelyik admin megnyithatja és folytathatja.
          </p>
          {drafts && drafts.length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Még nincs piszkozat.</p>}
          <div className="mini-queue">
            {(drafts || []).map((d) => (
              <div key={d.id} className="mini-queue-item">
                <MiniGrid rows={d.rows} small />
                <div className="mini-queue-info">
                  <span>
                    <b>{d.title || 'Névtelen tábla'}</b>
                    <br />
                    <span className="mini-muted">
                      {d.progress.complete}/{d.progress.total} szó kész · {d.progress.clued} kérdés · {d.updatedBy?.name || 'valaki'}, {when(d.updatedAt)}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="primary small" onClick={() => openDraft(d.id)}>
                      Megnyitás
                    </button>
                    <button className="ghost small danger" onClick={() => deleteDraft(d)}>
                      Törlés
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <b>Új szó felvitele</b>
        <div className="mini-add">
          <div>
            <label className="field-label" htmlFor="mini-new-word">Szó (1-5 betű)</label>
            <input id="mini-new-word" value={newWord.word} maxLength={5} onChange={(e) => setNewWord((w) => ({ ...w, word: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="mini-new-clue">Kérdés</label>
            <input id="mini-new-clue" value={newWord.clue} style={{ textTransform: 'none' }} onChange={(e) => setNewWord((w) => ({ ...w, clue: e.target.value }))} />
          </div>
          <button className="primary" onClick={addWord} disabled={!newWord.word.trim() || !newWord.clue.trim()}>
            Felvitel
          </button>
        </div>
      </div>

      <div className="card">
        <b>Várólista ({state?.queue.length || 0})</b>
        {state && state.queue.length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Még üres a várólista.</p>}
        <div className="mini-queue">
          {(state?.queue || []).map((q, i) => (
            <div key={q.id} className="mini-queue-item">
              <MiniGrid rows={q.rows} small />
              <div className="mini-queue-info">
                <span>
                  <b>{i + 1}.</b> {q.entries.map((e) => e.word.toUpperCase()).join(', ')}
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="ghost small" onClick={() => setTrying({ rows: q.rows, entries: q.entries })}>
                    Kipróbálom
                  </button>
                  <button className="ghost small danger" onClick={() => removeQueued(q.id)}>
                    Törlés
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Kipróbálás: a rejtvény úgy, ahogy a játékosok látni fogják. */}
      {trying && (
        <div className="modal-overlay mini-try-overlay" onClick={() => setTrying(null)}>
          <div className="modal-card" role="dialog" aria-label="Mini keresztrejtvény kipróbálása" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b>Kipróbálás</b>
              <button className="ghost small" onClick={() => setTrying(null)}>
                Bezárás
              </button>
            </div>
            <MiniPlayer rows={trying.rows} entries={trying.entries} />
          </div>
        </div>
      )}
    </>
  );
}
