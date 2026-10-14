'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { loadProgress, saveProgress } from '../../lib/progress';
import { computeNewAchievements } from '../../lib/achievements';
import FieldHelp from '../../components/FieldHelp';
import HintWordPicker from '../../components/HintWordPicker';
import { clueTokens } from '../../lib/clue';

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
  // A kiemelhető tippekhez kijelölt szavak indexei a rejtvényszövegben.
  const [words, setWords] = useState({ definicio: [], indikator: [], fodder: [] });
  // Melyik tippet adja meg a beküldő (mint az admin felületen: csak a bepipált tipp számít).
  const [enabled, setEnabled] = useState({ definicio: false, fodder: false, indikator: false, alternativ: false });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // Ha a rejtvény szövege rövidül, a már nem létező szavakra mutató kijelölések kiesnek.
    if (field === 'clue') {
      const n = clueTokens(value).filter((t) => t.w >= 0).length;
      setWords((w) => Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.filter((i) => i < n)])));
    }
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
            fodder: enabled.fodder ? form.fodder : '',
            indikator: enabled.indikator ? form.indikator : '',
            definicio: enabled.definicio ? form.definicio : '',
            alternativ: enabled.alternativ ? form.alternativ : '',
          },
          hintWords: {
            definicio: enabled.definicio && form.definicio.trim() ? words.definicio : [],
            indikator: enabled.indikator && form.indikator.trim() ? words.indikator : [],
            fodder: enabled.fodder && form.fodder.trim() ? words.fodder : [],
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
        setEnabled({ definicio: false, fodder: false, indikator: false, alternativ: false });
        setWords({ definicio: [], indikator: [], fodder: [] });
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
          <div className="field-label-row">
            <label className="field-label" htmlFor="sub-clue">A rejtvény szövege *</label>
            <FieldHelp label="Rejtvény">
              Ide írd be magát a rejtvényt! Ha inspirálódnál, nézd meg a{' '}
              <a href="/archive">korábbi titkosírásokat</a>!
            </FieldHelp>
          </div>
          <textarea
            id="sub-clue"
            value={form.clue}
            onChange={(e) => update('clue', e.target.value)}
            placeholder="Írd ide a teljes rejtvényt…"
          />

          <div className="field-label-row">
            <label className="field-label" htmlFor="sub-answer">A helyes válasz *</label>
            <FieldHelp label="Helyes válasz">
              A rejtvény megfejtése. Ha több szóból áll, szóközzel válaszd el a szavakat.
            </FieldHelp>
          </div>
          <input
            id="sub-answer"
            type="text"
            value={form.answer}
            onChange={(e) => update('answer', e.target.value)}
            placeholder="VÁLASZ"
          />

          {/* A tippek sorrendje ugyanaz, mint a játékban: Definíció, Készlet, Mutató; mindegyiket
              (mint az admin felületen) be kell pipálni, hogy megadható legyen. */}
          <div className="field-label-row hint-check-row">
            <input
              type="checkbox"
              id="sub-en-definicio"
              checked={enabled.definicio}
              onChange={(e) => setEnabled((en) => ({ ...en, definicio: e.target.checked }))}
            />
            <label className="field-label hint-check-label hl-type-definicio" htmlFor="sub-en-definicio">
              <span className="hl-dot" />Definíció (opcionális)
            </label>
            <FieldHelp label="Definíció">
              A rejtvény azon része, ami a megoldásra utal, mint egy keresztrejtvénynél! Be tudod jelölni a rejtvényben a szavakat, amik ebbe a kategóriába tartoznak.
            </FieldHelp>
          </div>
          {enabled.definicio && (
            <>
              <textarea aria-label="Definíció" value={form.definicio} onChange={(e) => update('definicio', e.target.value)} />
              {form.definicio.trim() && (
                <HintWordPicker clue={form.clue} type="definicio" words={words.definicio} onChange={(v) => setWords((w) => ({ ...w, definicio: v }))} />
              )}
            </>
          )}

          <div className="field-label-row hint-check-row">
            <input
              type="checkbox"
              id="sub-en-fodder"
              checked={enabled.fodder}
              onChange={(e) => setEnabled((en) => ({ ...en, fodder: e.target.checked }))}
            />
            <label className="field-label hint-check-label hl-type-fodder" htmlFor="sub-en-fodder">
              <span className="hl-dot" />Készlet (opcionális)
            </label>
            <FieldHelp label="Készlet">
              A rejtvény azon szavai, amiket a mutatók segítségével átformálunk a megoldássá. Be tudod jelölni a rejtvényben a szavakat, amik ebbe a kategóriába tartoznak.
            </FieldHelp>
          </div>
          {enabled.fodder && (
            <>
              <textarea aria-label="Készlet" value={form.fodder} onChange={(e) => update('fodder', e.target.value)} />
              {form.fodder.trim() && (
                <HintWordPicker clue={form.clue} type="fodder" words={words.fodder} onChange={(v) => setWords((w) => ({ ...w, fodder: v }))} />
              )}
            </>
          )}

          <div className="field-label-row hint-check-row">
            <input
              type="checkbox"
              id="sub-en-indikator"
              checked={enabled.indikator}
              onChange={(e) => setEnabled((en) => ({ ...en, indikator: e.target.checked }))}
            />
            <label className="field-label hint-check-label hl-type-indikator" htmlFor="sub-en-indikator">
              <span className="hl-dot" />Mutató (opcionális)
            </label>
            <FieldHelp label="Mutató">
              A rejtvény azon szavai, amik a készlet szavait a megoldássá formálják. Be tudod jelölni a rejtvényben a szavakat, amik ebbe a kategóriába tartoznak.
            </FieldHelp>
          </div>
          {enabled.indikator && (
            <>
              <textarea aria-label="Mutató" value={form.indikator} onChange={(e) => update('indikator', e.target.value)} />
              {form.indikator.trim() && (
                <HintWordPicker clue={form.clue} type="indikator" words={words.indikator} onChange={(v) => setWords((w) => ({ ...w, indikator: v }))} />
              )}
            </>
          )}

          <div className="field-label-row hint-check-row">
            <input
              type="checkbox"
              id="sub-en-alternativ"
              checked={enabled.alternativ}
              onChange={(e) => setEnabled((en) => ({ ...en, alternativ: e.target.checked }))}
            />
            <label className="field-label hint-check-label" htmlFor="sub-en-alternativ">
              Alternatív rejtvény (opcionális)
            </label>
            <FieldHelp label="Alternatív rejtvény">
              Egy önmagában is értelmes rejtvény: ha esetleg két változatod lenne belőle, itt tudod megadni a másikat.
            </FieldHelp>
          </div>
          {enabled.alternativ && (
            <>
              <textarea aria-label="Alternatív rejtvény" value={form.alternativ} onChange={(e) => update('alternativ', e.target.value)} />
            </>
          )}

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
              <a href="/privacy" style={{ color: 'var(--accent-text)' }}>
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
