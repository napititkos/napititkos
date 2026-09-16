'use client';
import { useEffect, useState } from 'react';
import { enumerationFor, splitAnswerWords } from '../../lib/format';

const HINT_TYPES = [
  { key: 'definicio', label: 'Definíció' },
  { key: 'indikator', label: 'Mutató' },
  { key: 'fodder', label: 'Alapszavak' },
  { key: 'alternativ', label: 'Alternatív tipp' },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function emptyEntry() {
  return {
    id: generateId(),
    clue: '',
    answer: '',
    parHints: 3,
    hints: {
      definicio: { enabled: false, text: '' },
      indikator: { enabled: false, text: '' },
      fodder: { enabled: false, text: '' },
      alternativ: { enabled: false, text: '' },
      betu: { enabled: true },
    },
  };
}

function migrateOldFormat(rawList) {
  const result = [];
  for (const item of rawList) {
    if (Array.isArray(item.clues)) {
      // Régi, "5 rejtvény egy csomagban" formátum — szétbontjuk önálló bejegyzésekre.
      for (const c of item.clues) {
        if (!c.clue && !c.answer) continue;
        result.push({
          id: generateId(),
          clue: c.clue || '',
          answer: c.answer || '',
          parHints: item.parHints ?? 3,
          hints: c.hints || {
            definicio: { enabled: false, text: '' },
            indikator: { enabled: false, text: '' },
            fodder: { enabled: false, text: '' },
            alternativ: { enabled: false, text: '' },
            betu: { enabled: true },
          },
        });
      }
    } else {
      result.push(item.id ? item : { ...item, id: generateId() });
    }
  }
  return result;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [entries, setEntries] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function tryLoad() {
    try {
      const res = await fetch('/api/admin/puzzles');
      if (res.status === 401) {
        setAuthed(false);
        return { ok: false, msg: null };
      }
      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        return {
          ok: false,
          msg: `A szerver hibát adott vissza (${res.status}). Részletek: ${bodyText.slice(0, 200) || 'nincs részlet.'}`,
        };
      }
      const data = await res.json();
      const migrated = migrateOldFormat(data.puzzles || []);
      setEntries(migrated);
      setAuthed(true);
      loadSubmissions();
      return { ok: true };
    } catch (err) {
      return { ok: false, msg: `Hálózati vagy feldolgozási hiba: ${err.message}` };
    }
  }

  async function loadSubmissions() {
    const res = await fetch('/api/submissions');
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.submissions || []);
    }
  }

  useEffect(() => {
    tryLoad();
  }, []);

  async function login(e) {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword('');
        const result = await tryLoad();
        if (!result.ok) {
          setLoginError(
            result.msg ||
              'A jelszó helyes volt, de a bejelentkezés mégsem maradt meg. Próbáld újra, vagy ellenőrizd, hogy a böngésződ nem blokkolja-e a sütiket.'
          );
        }
      } else {
        const bodyText = await res.text().catch(() => '');
        setLoginError(
          `Hibás jelszó, vagy nincs beállítva ADMIN_PASSWORD a szerveren. (${res.status}${bodyText ? ' — ' + bodyText.slice(0, 150) : ''})`
        );
      }
    } catch (err) {
      setLoginError(`Váratlan hiba történt: ${err.message}`);
    }
  }

  function updateEntry(ei, updater) {
    setEntries((prev) => {
      const next = [...prev];
      next[ei] = updater(next[ei]);
      return next;
    });
  }

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }
  function removeEntry(ei) {
    if (!confirm('Biztosan törlöd ezt a titkosírást?')) return;
    setEntries((prev) => prev.filter((_, i) => i !== ei));
  }
  function moveEntry(ei, dir) {
    setEntries((prev) => {
      const next = [...prev];
      const target = ei + dir;
      if (target < 0 || target >= next.length) return next;
      [next[ei], next[target]] = [next[target], next[ei]];
      return next;
    });
  }

  async function saveAll() {
    setLoading(true);
    setSaveStatus(null);
    const res = await fetch('/api/admin/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzles: entries }),
    });
    setLoading(false);
    setSaveStatus(res.ok ? 'Mentve!' : 'Nem sikerült menteni.');
  }

  async function deleteSubmission(id) {
    await fetch(`/api/submissions?id=${id}`, { method: 'DELETE' });
    loadSubmissions();
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
  }

  if (!authed) {
    return (
      <div className="wrap">
        <h1 className="page-title">Admin belépés</h1>
        <div className="card">
          <form onSubmit={login}>
            <label className="field-label">Admin jelszó</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ textTransform: 'none' }}
              />
              <button
                type="button"
                className="ghost"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
                title={showPassword ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="primary" type="submit">Belépés</button>
            </div>
          </form>
          {loginError && <div className="feedback hint" style={{ marginLeft: 0, marginTop: 12 }}>{loginError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Admin — titkosírások kezelése</h1>
        <button className="ghost small" onClick={logout}>Kijelentkezés</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <b>{entries.length} db titkosírás a sorban</b>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost small" onClick={addEntry}>+ Új titkosírás</button>
            <button className="primary small" onClick={saveAll} disabled={loading}>
              {loading ? 'Mentés…' : 'Összes mentése'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 0 }}>
          Minden nap délben (magyar idő szerint) egy új, még nem mutatott titkosírás jelenik meg a
          listából. Ha mindegyik sorra került már, a sorozat elölről kezdődik.
        </p>
        {saveStatus && <div className="feedback good" style={{ marginLeft: 0 }}>{saveStatus}</div>}

        {entries.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>#</th>
                  <th style={{ padding: '6px 8px' }}>Rejtvény</th>
                  <th style={{ padding: '6px 8px' }}>Válasz</th>
                  <th style={{ padding: '6px 8px' }}>Nehézség</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, ei) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--ink-soft)' }}>{ei + 1}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {(e.clue || '(üres)').slice(0, 50)}
                      {e.clue?.length > 50 ? '…' : ''}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{e.answer || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.parHints ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries.map((e, ei) => (
          <div className="puzzle-editor" key={e.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>#{ei + 1}. titkosírás</b>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="ghost small" onClick={() => moveEntry(ei, -1)}>↑</button>
                <button className="ghost small" onClick={() => moveEntry(ei, 1)}>↓</button>
                <button className="ghost small" onClick={() => removeEntry(ei)}>Törlés</button>
              </div>
            </div>

            <label className="field-label">A titkosírás szövege</label>
            <textarea
              value={e.clue}
              onChange={(ev) => updateEntry(ei, (en) => ({ ...en, clue: ev.target.value }))}
              placeholder="A rejtvény szövege (a karakterszámot ne írd bele, azt automatikusan hozzáadjuk)…"
            />

            <label className="field-label">Válasz (szavanként)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {splitAnswerWords(e.answer).map((word, wi) => (
                <input
                  key={wi}
                  type="text"
                  style={{ width: 130 }}
                  value={word}
                  onChange={(ev) => {
                    const words = splitAnswerWords(e.answer);
                    words[wi] = ev.target.value.toUpperCase();
                    updateEntry(ei, (en) => ({ ...en, answer: words.join(' ') }));
                  }}
                  placeholder={`${wi + 1}. szó`}
                />
              ))}
              <button
                type="button"
                className="ghost small"
                onClick={() => {
                  const words = splitAnswerWords(e.answer);
                  words.push('');
                  updateEntry(ei, (en) => ({ ...en, answer: words.join(' ') }));
                }}
              >
                + Szó hozzáadása
              </button>
              {splitAnswerWords(e.answer).length > 1 && (
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => {
                    const words = splitAnswerWords(e.answer);
                    words.pop();
                    updateEntry(ei, (en) => ({ ...en, answer: words.join(' ') }));
                  }}
                >
                  − Utolsó szó törlése
                </button>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
              Előnézet: <i>{e.clue || '(még nincs szöveg)'} {enumerationFor(e.answer)}</i>
            </p>

            <label className="field-label">
              Nehézség (azt jelöli, hány tippre van szüksége egy átlagos játékosnak a megoldáshoz)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              style={{ width: 90, textTransform: 'none' }}
              value={e.parHints ?? 3}
              onChange={(ev) =>
                updateEntry(ei, (en) => ({ ...en, parHints: Number(ev.target.value) || 0 }))
              }
            />

            {HINT_TYPES.map((h) => (
              <div key={h.key} style={{ marginTop: 10 }}>
                <div className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={e.hints[h.key]?.enabled || false}
                    onChange={(ev) =>
                      updateEntry(ei, (en) => ({
                        ...en,
                        hints: {
                          ...en.hints,
                          [h.key]: { ...en.hints[h.key], enabled: ev.target.checked },
                        },
                      }))
                    }
                    id={`hint-${e.id}-${h.key}`}
                  />
                  <label htmlFor={`hint-${e.id}-${h.key}`}>{h.label} tipp elérhető</label>
                </div>
                {e.hints[h.key]?.enabled && (
                  <textarea
                    value={e.hints[h.key]?.text || ''}
                    onChange={(ev) =>
                      updateEntry(ei, (en) => ({
                        ...en,
                        hints: {
                          ...en.hints,
                          [h.key]: { ...en.hints[h.key], text: ev.target.value },
                        },
                      }))
                    }
                    placeholder={`Írd be a(z) ${h.label.toLowerCase()} tippet…`}
                  />
                )}
              </div>
            ))}

            <div className="checkbox-row" style={{ opacity: 0.75, marginTop: 10 }}>
              <input type="checkbox" checked disabled />
              <label>Helyes betű tipp elérhető (automatikus, mindig jelen van)</label>
            </div>
          </div>
        ))}

        <button className="primary" onClick={saveAll} disabled={loading}>
          {loading ? 'Mentés…' : 'Összes mentése'}
        </button>
      </div>

      <div className="card">
        <b>Beküldött fanmade rejtvények ({submissions.length})</b>
        {submissions.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Még nincs beküldött rejtvény.</p>
        )}
        {submissions.map((s) => (
          <div className="sub-item" key={s.id}>
            <div><b>{s.name}</b> — {new Date(s.createdAt).toLocaleString('hu-HU')}</div>
            <div style={{ margin: '6px 0' }}>{s.clue}</div>
            <div>Válasz: <b>{s.answer}</b></div>
            {s.hints?.definicio && <div>Definíció: {s.hints.definicio}</div>}
            {s.hints?.indikator && <div>Mutató: {s.hints.indikator}</div>}
            {s.hints?.fodder && <div>Alapszavak: {s.hints.fodder}</div>}
            {s.hints?.alternativ && <div>Alternatív: {s.hints.alternativ}</div>}
            <div style={{ marginTop: 8 }}>
              <button className="ghost small" onClick={() => deleteSubmission(s.id)}>Törlés</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
