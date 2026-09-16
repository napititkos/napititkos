'use client';
import { useState } from 'react';
import { loadProgress, saveProgress } from '../../lib/progress';
import { computeNewAchievements } from '../../lib/achievements';

export default function SubmitPage() {
  const [form, setForm] = useState({
    name: '',
    clue: '',
    answer: '',
    fodder: '',
    indikator: '',
    definicio: '',
    alternativ: '',
  });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.clue.trim() || !form.answer.trim()) {
      setStatus({ ok: false, msg: 'A rejtvény szövege és a válasz kitöltése kötelező.' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
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
        setForm({ name: '', clue: '', answer: '', fodder: '', indikator: '', definicio: '', alternativ: '' });
      } else {
        setStatus({ ok: false, msg: 'Valami nem sikerült. Próbáld újra kicsit később.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Nem sikerült elküldeni. Ellenőrizd az internetkapcsolatot.' });
    }
    setSending(false);
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Fanmade rejtvény beküldése</h1>
      <div className="card">
        <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', marginTop: 0 }}>
          Van egy jó ötleted egy kriptikus rejtvényhez? Küldd be, és ha beválik, bekerülhet a napi
          rejtvények közé!
        </p>
        <form onSubmit={submit}>
          <label className="field-label">Beceneved (opcionális)</label>
          <input
            type="text"
            style={{ textTransform: 'none' }}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Pl. RejtvényRajongó"
          />

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

          <div style={{ marginTop: 16 }}>
            <button className="primary" type="submit" disabled={sending}>
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
