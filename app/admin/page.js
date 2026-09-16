'use client';
import { useEffect, useState } from 'react';

const HINT_TYPES = [
  { key: 'definicio', label: 'Definíció' },
  { key: 'indikator', label: 'Mutató' },
  { key: 'fodder', label: 'Alapszavak' },
  { key: 'alternativ', label: 'Alternatív tipp' },
];

function emptyClue() {
  return {
    clue: '',
    answer: '',
    hints: {
      definicio: { enabled: false, text: '' },
      indikator: { enabled: false, text: '' },
      fodder: { enabled: false, text: '' },
      alternativ: { enabled: false, text: '' },
      betu: { enabled: true },
    },
  };
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function emptyPuzzle() {
  return {
    id: generateId(),
    parHints: 3,
    clues: [emptyClue(), emptyClue(), emptyClue(), emptyClue(), emptyClue()],
  };
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [puzzles, setPuzzles] = useState([]);
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
      const withIds = (data.puzzles || []).map((p) => (p.id ? p : { ...p, id: generateId() }));
      setPuzzles(withIds);
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

  function updatePuzzle(pi, updater) {
    setPuzzles((prev) => {
      const next = [...prev];
      next[pi] = updater(next[pi]);
      return next;
    });
  }
  function updateClue(pi, ci, updater) {
    updatePuzzle(pi, (p) => {
      const clues = [...p.clues];
      clues[ci] = updater(clues[ci]);
      return { ...p, clues };
    });
  }

  function addPuzzle() {
    setPuzzles((prev) => [...prev, emptyPuzzle()]);
  }
  function removePuzzle(pi) {
    if (!confirm('Biztosan törlöd ezt a teljes napi rejtvényt?')) return;
    setPuzzles((prev) => prev.filter((_, i) => i !== pi));
  }
  function movePuzzle(pi, dir) {
    setPuzzles((prev) => {
      const next = [...prev];
      const target = pi + dir;
      if (target < 0 || target >= next.length) return next;
      [next[pi], next[target]] = [next[target], next[pi]];
      return next;
    });
  }
  function addClue(pi) {
    updatePuzzle(pi, (p) => ({ ...p, clues: [...p.clues, emptyClue()] }));
  }
  function removeClue(pi, ci) {
    updatePuzzle(pi, (p) => ({ ...p, clues: p.clues.filter((_, i) => i !== ci) }));
  }

  async function saveAll() {
    setLoading(true);
    setSaveStatus(null);
    const res = await fetch('/api/admin/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzles }),
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
        <h1 className="page-title">Admin — rejtvények kezelése</h1>
        <button className="ghost small" onClick={logout}>Kijelentkezés</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <b>{puzzles.length} napi rejtvénycsomag</b>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost small" onClick={addPuzzle}>+ Új napi rejtvény</button>
            <button className="primary small" onClick={saveAll} disabled={loading}>
              {loading ? 'Mentés…' : 'Összes mentése'}
            </button>
          </div>
        </div>
        {saveStatus && <div className="feedback good" style={{ marginLeft: 0 }}>{saveStatus}</div>}

        {puzzles.map((p, pi) => (
          <div className="puzzle-editor" key={pi}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>#{pi + 1}. napi rejtvény</b>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="ghost small" onClick={() => movePuzzle(pi, -1)}>↑</button>
                <button className="ghost small" onClick={() => movePuzzle(pi, 1)}>↓</button>
                <button className="ghost small" onClick={() => removePuzzle(pi)}>Törlés</button>
              </div>
            </div>

            <div style={{ margin: '10px 0 4px' }}>
              <label className="field-label" style={{ margin: '0 0 4px' }}>
                Nehézség (azt jelöli, hány tippre van szüksége egy átlagos játékosnak a megoldáshoz)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                style={{ width: 90, textTransform: 'none' }}
                value={p.parHints ?? 3}
                onChange={(e) =>
                  updatePuzzle(pi, (pp) => ({ ...pp, parHints: Number(e.target.value) || 0 }))
                }
              />
            </div>

            {p.clues.map((c, ci) => (
              <div className="clue-editor" key={ci}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label className="field-label">Rejtvény #{ci + 1}</label>
                  <button className="ghost small" onClick={() => removeClue(pi, ci)}>Sor törlése</button>
                </div>
                <textarea
                  value={c.clue}
                  onChange={(e) =>
                    updateClue(pi, ci, (cl) => ({ ...cl, clue: e.target.value }))
                  }
                  placeholder="A rejtvény teljes szövege…"
                />
                <label className="field-label">Válasz</label>
                <input
                  type="text"
                  value={c.answer}
                  onChange={(e) =>
                    updateClue(pi, ci, (cl) => ({ ...cl, answer: e.target.value }))
                  }
                />

                {HINT_TYPES.map((h) => (
                  <div key={h.key}>
                    <div className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={c.hints[h.key]?.enabled || false}
                        onChange={(e) =>
                          updateClue(pi, ci, (cl) => ({
                            ...cl,
                            hints: {
                              ...cl.hints,
                              [h.key]: { ...cl.hints[h.key], enabled: e.target.checked },
                            },
                          }))
                        }
                        id={`hint-${pi}-${ci}-${h.key}`}
                      />
                      <label htmlFor={`hint-${pi}-${ci}-${h.key}`}>{h.label} tipp elérhető</label>
                    </div>
                    {c.hints[h.key]?.enabled && (
                      <textarea
                        value={c.hints[h.key]?.text || ''}
                        onChange={(e) =>
                          updateClue(pi, ci, (cl) => ({
                            ...cl,
                            hints: {
                              ...cl.hints,
                              [h.key]: { ...cl.hints[h.key], text: e.target.value },
                            },
                          }))
                        }
                        placeholder={`Írd be a(z) ${h.label.toLowerCase()} tippet…`}
                      />
                    )}
                  </div>
                ))}

                <div className="checkbox-row" style={{ opacity: 0.75 }}>
                  <input type="checkbox" checked disabled />
                  <label>Helyes betű tipp elérhető (automatikus, minden rejtvénynél jelen van)</label>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <button className="ghost small" onClick={() => addClue(pi)}>+ Új rejtvénysor</button>
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
