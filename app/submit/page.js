'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress, saveProgress } from '../../lib/progress';
import { computeNewAchievements } from '../../lib/achievements';

export default function SubmitPage() {
  const { data: session, status: authStatus } = useSession();
  const [form, setForm] = useState({
    clue: '',
    answer: '',
    fodder: '',
    indikator: '',
    definicio: '',
    alternativ: '',
  });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.clue.trim() || !form.answer.trim()) {
      setStatus({ ok: false, msg: 'A rejtvény szövege és a válasz kitöltése kötelező.' });
      return;
    }
    if (!consent) {
      setStatus({ ok: false, msg: 'A beküldéshez el kell fogadnod az alábbi feltételt.' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clue: form.clue,
          answer: form.answer,
          hints: {
            fodder: form.fodder,
            indikator: form.indikator,
            definicio: form.definicio,
            alternativ: form.alternativ,
          },
        }),
      });
      if (res.ok) {
        let extra = '';
        const prog = loadProgress();
        if (!prog.submittedPuzzle) {
          prog.submittedPuzzle = true;
          const { unlocked, newly } = computeNewAchievements(
            {
              totalSolved: prog.totalSolved || 0,
              streak: prog.streak || 0,
              fastestTime: prog.fastestTime,
              submittedPuzzle: true,
              readHelp: prog.readHelp || false,
            },
            prog.unlocked
          );
          prog.unlocked = unlocked;
          saveProgress(prog);
          if (newly.includes('submitted_puzzle')) extra = ' 🏆 Új eredmény: Beküldő!';
        }
        setStatus({ ok: true, msg: 'Köszönjük! Megkaptuk a rejtvényedet, hamarosan átnézzük.' + extra });
        setForm({ clue: '', answer: '', fodder: '', indikator: '', definicio: '', alternativ: '' });
        setConsent(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus({ ok: false, msg: data.message || 'Valami nem sikerült. Próbáld újra kicsit később.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Nem sikerült elküldeni. Ellenőrizd az internetkapcsolatot.' });
    }
    setSending(false);
  }

  if (authStatus === 'loading') {
    return (
      <div className="wrap">
        <h1 className="page-title">Fanmade rejtvény beküldése</h1>
        <div className="card">Betöltés…</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="wrap">
        <h1 className="page-title">Fanmade rejtvény beküldése</h1>
        <div className="card">
          <p style={{ fontSize: 14.5 }}>
            A rejtvények beküldéséhez be kell jelentkezned - így tudjuk feltüntetni a nevedet a
            rejtvényed mellett, ha bekerül a napi titkosírások közé.
          </p>
          <a href="/login">
            <button className="primary">Bejelentkezés</button>
          </a>
        </div>
      </div>
    );
  }

  if (!session.user.verified) {
    return (
      <div className="wrap">
        <h1 className="page-title">Fanmade rejtvény beküldése</h1>
        <div className="card">
          <p style={{ fontSize: 14.5 }}>
            Már bejelentkeztél, de az email címed még nincs megerősítve. Nézd meg a postaládádat -
            küldtünk egy megerősítő linket, amikor regisztráltál. Ha nem találod (pl. mert régebben
            regisztráltál, mielőtt ezt bevezettük), kérhetsz egy újat:
          </p>
          <button
            className="primary"
            disabled={resending}
            onClick={async () => {
              setResending(true);
              setResendMsg(null);
              const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
              setResending(false);
              setResendMsg(
                res.ok
                  ? { ok: true, msg: 'Elküldtük az új megerősítő linket! Nézd meg a postaládádat.' }
                  : { ok: false, msg: 'Nem sikerült elküldeni. Próbáld újra kicsit később.' }
              );
            }}
          >
            {resending ? 'Küldés…' : 'Megerősítő email újraküldése'}
          </button>
          {resendMsg && (
            <div className={`feedback ${resendMsg.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 14 }}>
              {resendMsg.msg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Fanmade rejtvény beküldése</h1>
      <div className="card">
        <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', marginTop: 0 }}>
          Van egy jó ötleted egy kriptikus rejtvényhez? Küldd be, és ha beválik, bekerülhet a napi
          rejtvények közé! Beküldőként ez fog megjelenni: <b>{session.user.name || session.user.email}</b>
        </p>
        <form onSubmit={submit}>
          <label className="field-label">A rejtvény szövege *</label>
          <textarea
            value={form.clue}
            onChange={(e) => update('clue', e.target.value)}
            placeholder="Írd ide a teljes rejtvényt…"
          />

          <label className="field-label">A helyes válasz *</label>
          <input
            type="text"
            value={form.answer}
            onChange={(e) => update('answer', e.target.value)}
            placeholder="VÁLASZ"
          />

          <label className="field-label">Definíció (opcionális tipp)</label>
          <textarea value={form.definicio} onChange={(e) => update('definicio', e.target.value)} />

          <label className="field-label">Mutató (opcionális tipp)</label>
          <textarea value={form.indikator} onChange={(e) => update('indikator', e.target.value)} />

          <label className="field-label">Készlet (opcionális tipp)</label>
          <textarea value={form.fodder} onChange={(e) => update('fodder', e.target.value)} />

          <label className="field-label">Alternatív tipp (opcionális)</label>
          <textarea value={form.alternativ} onChange={(e) => update('alternativ', e.target.value)} />

          <div className="checkbox-row" style={{ marginTop: 16, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <label htmlFor="consent" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              Kijelentem, hogy elolvastam és elfogadom az{' '}
              <a href="/privacy" style={{ color: 'var(--accent)' }}>
                Adatvédelmi tájékoztatót
              </a>
              .
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="primary" type="submit" disabled={sending || !consent}>
              {sending ? 'Küldés…' : 'Beküldés'}
            </button>
          </div>
        </form>
        {status && (
          <div className={`feedback ${status.ok ? 'good' : 'hint'}`} style={{ marginLeft: 0, marginTop: 14 }}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
