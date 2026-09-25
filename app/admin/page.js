'use client';
import { useEffect, useState } from 'react';
import { enumerationFor, splitAnswerWords } from '../../lib/format';

const HINT_TYPES = [
  { key: 'definicio', label: 'Definíció' },
  { key: 'indikator', label: 'Mutató' },
  { key: 'fodder', label: 'Készlet' },
  { key: 'alternativ', label: 'Alternatív tipp' },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function emptyEntry() {
  return {
    id: generateId(),
    clue: '',
    answer: '',
    answerWords: [''],
    parHints: 3,
    submittedBy: '',
    submittedByEmail: '',
    scheduledDate: '',
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
      // Régi, "5 rejtvény egy csomagban" formátum - szétbontjuk önálló bejegyzésekre.
      for (const c of item.clues) {
        if (!c.clue && !c.answer) continue;
        result.push({
          id: generateId(),
          clue: c.clue || '',
          answer: c.answer || '',
          answerWords: splitAnswerWords(c.answer || ''),
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
      const withId = item.id ? item : { ...item, id: generateId() };
      result.push(
        withId.answerWords ? withId : { ...withId, answerWords: splitAnswerWords(withId.answer || '') }
      );
    }
  }
  return result;
}

function indexedEntries(entries) {
  return entries.map((entry, index) => ({ entry, index }));
}
function isArchived(entry, shownDateById, currentActiveId) {
  return !!shownDateById[entry.id] && entry.id !== currentActiveId;
}
function sortIndexed(list, mode, direction, justAddedId) {
  let sorted = list;
  if (mode === 'time') {
    // Az id base36 időbélyeggel kezdődik, ezért lexikografikusan is időrendet ad.
    sorted = [...list].sort((a, b) => (a.entry.id > b.entry.id ? 1 : -1));
  } else if (mode === 'clue') {
    sorted = [...list].sort((a, b) =>
      (a.entry.clue || '').localeCompare(b.entry.clue || '', 'hu')
    );
  }
  if ((mode === 'time' || mode === 'clue') && direction === 'desc') {
    sorted = [...sorted].reverse();
  }
  if (mode === 'manual' && justAddedId) {
    const idx = sorted.findIndex((item) => item.entry.id === justAddedId);
    if (idx > 0) {
      const copy = [...sorted];
      const [item] = copy.splice(idx, 1);
      sorted = [item, ...copy];
    }
  }
  return sorted;
}
function freshEntries(entries, mode, direction, justAddedId, shownDateById, currentActiveId) {
  const list = indexedEntries(entries).filter(
    ({ entry }) => !isArchived(entry, shownDateById, currentActiveId)
  );
  return sortIndexed(list, mode, direction, justAddedId);
}
function archivedList(entries, shownDateById, currentActiveId) {
  const list = indexedEntries(entries).filter(({ entry }) =>
    isArchived(entry, shownDateById, currentActiveId)
  );
  // Legfrissebb (legutóbb futott) elöl.
  list.sort((a, b) => {
    const da = shownDateById[a.entry.id] || '';
    const db = shownDateById[b.entry.id] || '';
    return db.localeCompare(da);
  });
  return list;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [entries, setEntries] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifText, setNotifText] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [sortMode, setSortMode] = useState('manual');
  const [sortDirection, setSortDirection] = useState('asc');
  const [justAddedId, setJustAddedId] = useState(null);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [shownDateById, setShownDateById] = useState({});
  const [currentActiveId, setCurrentActiveId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

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
      loadHistory();
      loadUsers();
      loadNotifications();
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

  async function loadUsers() {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }

  async function loadNotifications() {
    const res = await fetch('/api/admin/notifications');
    if (res.ok) setNotifications((await res.json()).notifications || []);
  }

  async function sendNotification() {
    if (!notifText.trim()) return;
    if (!confirm('Kiküldöd ezt az értesítést minden látogatónak?')) return;
    setNotifSending(true);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: notifText }),
    });
    setNotifSending(false);
    if (res.ok) {
      setNotifications((await res.json()).notifications || []);
      setNotifText('');
    } else {
      alert('Nem sikerült elküldeni az értesítést.');
    }
  }

  async function deleteNotification(id) {
    if (!confirm('Biztosan törlöd ezt az értesítést?')) return;
    const res = await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE' });
    if (res.ok) setNotifications((await res.json()).notifications || []);
    else alert('Nem sikerült törölni.');
  }

  async function changeUserRole(id, role, name) {
    if (role === 'admin') {
      const sure = confirm(`Biztosan admin-jogot adsz ennek a felhasználónak: ${name}?`);
      if (!sure) return;
    }
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } else {
      alert('Nem sikerült módosítani a jogosultságot.');
    }
  }

  async function loadHistory() {
    const res = await fetch('/api/admin/history');
    if (res.ok) {
      const data = await res.json();
      const map = {};
      (data.history || []).forEach((h) => {
        map[h.id] = h.shownDate;
      });
      setShownDateById(map);
      setCurrentActiveId(data.currentId || null);
    }
  }

  // Belépés lépései: 1) bejelentkezett fiók, 2) admin jog a fiókon, 3) admin jelszó
  // (ez indítja a 8 órás admin munkamenetet, a fiókhoz kötve).
  const [access, setAccess] = useState('loading'); // loading | login | forbidden | password | ok
  async function checkAccess() {
    try {
      const d = await (await fetch('/api/admin/login', { cache: 'no-store' })).json();
      if (!d.loggedIn) return setAccess('login');
      if (!d.admin) return setAccess('forbidden');
      if (!d.session) return setAccess('password');
      const result = await tryLoad();
      if (result?.ok === false) {
        if (result.msg) setLoginError(result.msg);
        return setAccess('password');
      }
      setAccess('ok');
    } catch {
      setAccess('login');
    }
  }
  useEffect(() => {
    checkAccess();
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
        } else {
          setAccess('ok');
        }
      } else if (res.status === 403) {
        // Közben kijelentkezett, vagy elvették az admin jogát.
        await checkAccess();
      } else if (res.status === 429) {
        setLoginError('Túl sok sikertelen próbálkozás. Próbáld újra 15 perc múlva.');
      } else {
        setLoginError('Hibás admin jelszó.');
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
    const fresh = emptyEntry();
    setEntries((prev) => [...prev, fresh]);
    setExpandedId(fresh.id);
    setJustAddedId(fresh.id);
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
    const normalized = entries.map((en) => ({
      ...en,
      answer: (en.answerWords || splitAnswerWords(en.answer)).join(' ').trim(),
      parHints: en.parHints === '' || en.parHints == null ? 0 : en.parHints,
    }));
    const res = await fetch('/api/admin/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzles: normalized }),
    });
    setLoading(false);
    setSaveStatus(res.ok ? 'Mentve!' : 'Nem sikerült menteni.');
  }

  function convertSubmissionToEntry(s) {
    const fresh = {
      id: generateId(),
      clue: capitalizeFirst(s.clue || ''),
      answer: (s.answer || '').toUpperCase(),
      answerWords: splitAnswerWords((s.answer || '').toUpperCase()),
      parHints: 3,
      submittedBy: s.name && s.name !== 'Névtelen' ? s.name : '',
      submittedByEmail: s.submitterEmail || '',
      hints: {
        definicio: { enabled: !!s.hints?.definicio, text: capitalizeFirst(s.hints?.definicio || '') },
        indikator: { enabled: !!s.hints?.indikator, text: capitalizeFirst(s.hints?.indikator || '') },
        fodder: { enabled: !!s.hints?.fodder, text: capitalizeFirst(s.hints?.fodder || '') },
        alternativ: { enabled: !!s.hints?.alternativ, text: capitalizeFirst(s.hints?.alternativ || '') },
        betu: { enabled: true },
      },
    };
    setEntries((prev) => [...prev, fresh]);
    setExpandedId(fresh.id);
    setJustAddedId(fresh.id);
    setSortMode('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteSubmission(id) {
    await fetch(`/api/submissions?id=${id}`, { method: 'DELETE' });
    loadSubmissions();
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
    setAccess('password');
  }

  function renderEntryRow(e, ei) {
          const isOpen = expandedId === e.id;
          const answerShown = !!revealedAnswers[e.id];
          return (
            <div className="puzzle-editor" key={e.id}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(isOpen ? null : e.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span>{isOpen ? '▾' : '▸'}</span>
                  <b>#{ei + 1}.</b>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                    {e.clue || '(üres)'}
                  </span>
                  {e.answer ? (
                    answerShown ? (
                      <span
                        style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', display: 'inline-block', minWidth: 100 }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setRevealedAnswers((prev) => ({ ...prev, [e.id]: false }));
                        }}
                        title="Elrejtés"
                      >
                        {e.answer}
                      </span>
                    ) : (
                      <button
                        className="ghost small"
                        style={{ minWidth: 100 }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setRevealedAnswers((prev) => ({ ...prev, [e.id]: true }));
                        }}
                      >
                        Megoldás
                      </button>
                    )
                  ) : (
                    <span style={{ color: 'var(--ink-soft)', fontSize: 13, display: 'inline-block', minWidth: 100 }}>(nincs válasz)</span>
                  )}
                  {e.scheduledDate && (
                    <span className="progress-badge" title="Beütemezve">
                      📅 {e.scheduledDate}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }} onClick={(ev) => ev.stopPropagation()}>
                  <button className="ghost small" onClick={() => moveEntry(ei, -1)}>↑</button>
                  <button className="ghost small" onClick={() => moveEntry(ei, 1)}>↓</button>
                  <button className="ghost small" onClick={() => removeEntry(ei)}>Törlés</button>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: 14 }}>
                  <label className="field-label">A titkosírás szövege</label>
                  <textarea
                    value={e.clue}
                    onChange={(ev) => updateEntry(ei, (en) => ({ ...en, clue: capitalizeFirst(ev.target.value) }))}
                    placeholder="A rejtvény szövege (a karakterszámot ne írd bele, azt automatikusan hozzáadjuk)…"
                  />

                  <label className="field-label">Válasz (szavanként)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {(e.answerWords || ['']).map((word, wi) => (
                      <input
                        key={wi}
                        type="text"
                        style={{ width: 130 }}
                        value={word}
                        onChange={(ev) => {
                          const words = [...(e.answerWords || [''])];
                          words[wi] = ev.target.value.toUpperCase();
                          updateEntry(ei, (en) => ({ ...en, answerWords: words }));
                        }}
                        placeholder={`${wi + 1}. szó`}
                      />
                    ))}
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => {
                        const words = [...(e.answerWords || ['']), ''];
                        updateEntry(ei, (en) => ({ ...en, answerWords: words }));
                      }}
                    >
                      + Szó hozzáadása
                    </button>
                    {(e.answerWords || ['']).length > 1 && (
                      <button
                        type="button"
                        className="ghost small"
                        onClick={() => {
                          const words = (e.answerWords || ['']).slice(0, -1);
                          updateEntry(ei, (en) => ({ ...en, answerWords: words }));
                        }}
                      >
                        − Utolsó szó törlése
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
                    Előnézet:{' '}
                    <i>
                      {e.clue || '(még nincs szöveg)'} {enumerationFor((e.answerWords || ['']).join(' '))}
                    </i>
                  </p>

                  <label className="field-label">
                    Nehézség (azt jelöli, hány tippre van szüksége egy átlagos játékosnak a megoldáshoz)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    style={{ width: 90, textTransform: 'none' }}
                    value={e.parHints === '' || e.parHints == null ? '' : e.parHints}
                    onChange={(ev) => {
                      const raw = ev.target.value;
                      updateEntry(ei, (en) => ({
                        ...en,
                        parHints: raw === '' ? '' : Number(raw),
                      }));
                    }}
                  />

                  <label className="field-label">Beküldő neve (opcionális - megjelenik a játékosoknak)</label>
                  <input
                    type="text"
                    style={{ textTransform: 'none' }}
                    value={e.submittedBy || ''}
                    onChange={(ev) => updateEntry(ei, (en) => ({ ...en, submittedBy: ev.target.value }))}
                    placeholder="pl. saját, vagy egy beküldő beceneve"
                  />

                  <label className="field-label">
                    Ütemezve (opcionális - ha kitöltöd, pontosan azon a napon fog megjelenni; üresen hagyva automatikusan, a sorban következve kerül sorra)
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="date"
                      style={{ width: 170, textTransform: 'none' }}
                      value={e.scheduledDate || ''}
                      onChange={(ev) => updateEntry(ei, (en) => ({ ...en, scheduledDate: ev.target.value }))}
                    />
                    {e.scheduledDate && (
                      <button
                        className="ghost small"
                        onClick={() => updateEntry(ei, (en) => ({ ...en, scheduledDate: '' }))}
                      >
                        Ütemezés törlése
                      </button>
                    )}
                  </div>

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
                                [h.key]: { ...en.hints[h.key], text: capitalizeFirst(ev.target.value) },
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

                  <div style={{ marginTop: 16 }}>
                    <button className="primary small" onClick={saveAll} disabled={loading}>
                      {loading ? 'Mentés…' : 'Mentés'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
  }

  if (access !== 'ok' || !authed) {
    return (
      <div className="wrap">
        <h1 className="page-title">Admin felület</h1>
        <div className="card">
          {access === 'loading' && <p style={{ margin: 0 }}>Jogosultság ellenőrzése…</p>}
          {access === 'login' && (
            <>
              <p style={{ marginTop: 0 }}>Az admin felülethez jelentkezz be egy admin jogú fiókkal.</p>
              <a href="/login?callbackUrl=/admin">
                <button className="primary">Bejelentkezés</button>
              </a>
            </>
          )}
          {access === 'forbidden' && (
            <p style={{ margin: 0 }}>
              Ehhez a fiókhoz nincs admin jog. Ha szerinted kellene lennie, kérd meg egy admint, hogy adja meg a
              jogot a Felhasználók listában.
            </p>
          )}
          {access === 'password' && (
            <form onSubmit={login}>
              <p style={{ marginTop: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                Admin jogú fiókkal vagy bejelentkezve. A folytatáshoz add meg az admin jelszót is.
              </p>
              <label className="field-label">Admin jelszó</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ textTransform: 'none' }}
                  autoComplete="current-password"
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
          )}
          {access === 'ok' && !authed && <p style={{ margin: 0 }}>Betöltés…</p>}
          {loginError && <div className="feedback hint" style={{ marginLeft: 0, marginTop: 12 }}>{loginError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Admin - titkosírások kezelése</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="ghost small"
            onClick={async () => {
              if (!confirm('Eltávolítja az üres és a duplikált bejegyzéseket az archívumból. Folytatod?')) return;
              const res = await fetch('/api/admin/clean-history', { method: 'POST' });
              const data = await res.json();
              if (res.ok) {
                alert(`Kész! ${data.removedEmpty} üres és ${data.removedDuplicate} duplikált bejegyzés eltávolítva.`);
              } else {
                alert('Nem sikerült a tisztítás.');
              }
            }}
          >
            🧹 Archívum tisztítása
          </button>
          <button className="ghost small" onClick={logout}>Kijelentkezés</button>
        </div>
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
          Minden nap éjfélkor (magyar idő szerint) egy új, még nem mutatott titkosírás jelenik meg a
          listából. Ha mindegyik sorra került már, a sorozat elölről kezdődik.
        </p>
        {saveStatus && (
          <div className="feedback good" style={{ marginLeft: 0, marginTop: 14, display: 'inline-block' }}>
            {saveStatus}
          </div>
        )}

        {entries.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Rendezés:</span>
            <button
              className={sortMode === 'manual' ? 'primary small' : 'ghost small'}
              onClick={() => {
                setSortMode('manual');
              }}
            >
              Egyéni sorrend
            </button>
            <button
              className={sortMode === 'time' ? 'primary small' : 'ghost small'}
              onClick={() => {
                setJustAddedId(null);
                if (sortMode === 'time') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                else {
                  setSortMode('time');
                  setSortDirection('asc');
                }
              }}
            >
              Idő szerint {sortMode === 'time' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              className={sortMode === 'clue' ? 'primary small' : 'ghost small'}
              onClick={() => {
                setJustAddedId(null);
                if (sortMode === 'clue') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                else {
                  setSortMode('clue');
                  setSortDirection('asc');
                }
              }}
            >
              Rejtvény (ABC) {sortMode === 'clue' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
          </div>
        )}

        {freshEntries(entries, sortMode, sortDirection, justAddedId, shownDateById, currentActiveId).map(
          ({ entry: e, index: ei }) => renderEntryRow(e, ei)
        )}

        {archivedList(entries, shownDateById, currentActiveId).length > 0 && (
          <div className="puzzle-editor" style={{ borderStyle: 'solid' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowArchived((v) => !v)}
            >
              <b>
                {showArchived ? '▾' : '▸'} 📦 Archivált ({archivedList(entries, shownDateById, currentActiveId).length})
              </b>
            </div>
            {showArchived && (
              <div style={{ marginTop: 14 }}>
                {archivedList(entries, shownDateById, currentActiveId).map(({ entry: e, index: ei }) =>
                  renderEntryRow(e, ei)
                )}
              </div>
            )}
          </div>
        )}

        <button className="primary" onClick={saveAll} disabled={loading}>
          {loading ? 'Mentés…' : 'Összes mentése'}
        </button>
      </div>

      <div className="card">
        <b>Értesítések ({notifications.length})</b>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 8px' }}>
          Amíg van legalább egy értesítés, a főoldalon a Ranglista mellett megjelenik egy harang ikon.
          Új értesítésnél a látogatóknak egy pont jelzi, hogy még nem olvasták.
        </p>
        <textarea
          value={notifText}
          maxLength={1000}
          onChange={(e) => setNotifText(e.target.value)}
          placeholder="Értesítés szövege…"
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{notifText.length}/1000</span>
          <button className="primary small" disabled={notifSending || !notifText.trim()} onClick={sendNotification}>
            {notifSending ? 'Küldés…' : 'Értesítés kiküldése'}
          </button>
        </div>
        {notifications.map((n) => (
          <div className="sub-item" key={n.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{new Date(n.ts).toLocaleString('hu-HU')}</div>
              <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.text}</div>
            </div>
            <button className="ghost small" onClick={() => deleteNotification(n.id)}>
              Törlés
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setUsersExpanded((v) => !v)}
        >
          <b>{usersExpanded ? '▾' : '▸'} Felhasználók ({users.length})</b>
        </div>
        {usersExpanded && (
          <>
            {users.length === 0 && (
              <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Még nincs regisztrált felhasználó.</p>
            )}
            {users.map((u) => (
              <div className="sub-item" key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <div>
                    <b>{u.name || u.email}</b>{' '}
                    {u.role === 'admin' && (
                      <span className="progress-badge" style={{ marginLeft: 6 }}>admin</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    {u.email} · {u.emailVerified ? 'megerősítve' : 'nincs megerősítve'}
                  </div>
                </div>
                <button
                  className="ghost small"
                  onClick={() => changeUserRole(u.id, u.role === 'admin' ? 'user' : 'admin', u.name || u.email)}
                >
                  {u.role === 'admin' ? 'Admin-jog visszavonása' : 'Admin-jog adása'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="card">
        <b>Beküldött fanmade rejtvények ({submissions.length})</b>
        {submissions.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Még nincs beküldött rejtvény.</p>
        )}
        {submissions.map((s) => (
          <div className="sub-item" key={s.id}>
            <div><b>{s.name}</b> - {new Date(s.createdAt).toLocaleString('hu-HU')}</div>
            <div style={{ margin: '6px 0' }}>{s.clue}</div>
            <div>Válasz: <b>{s.answer}</b></div>
            {s.hints?.definicio && <div>Definíció: {s.hints.definicio}</div>}
            {s.hints?.indikator && <div>Mutató: {s.hints.indikator}</div>}
            {s.hints?.fodder && <div>Készlet: {s.hints.fodder}</div>}
            {s.hints?.alternativ && <div>Alternatív: {s.hints.alternativ}</div>}
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="ghost small" onClick={() => convertSubmissionToEntry(s)}>
                ✏️ Átemelés rejtvénynek
              </button>
              <button className="ghost small" onClick={() => deleteSubmission(s.id)}>Törlés</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
