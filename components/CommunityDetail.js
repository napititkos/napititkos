'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PuzzlePlayer from './PuzzlePlayer';
import Icon from './Icon';
import { Stars } from './Stars';
import { enumerationFor } from '../lib/format';

// Egy közösségi titkosírás megnyitva: megoldó felület (tippekkel), értékelés, reakciók, és
// adminnak a beemelés / törlés.
export default function CommunityDetail({ id, onChanged, onDeleted }) {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const isAdmin = session?.user?.role === 'admin';

  function load() {
    fetch(`/api/community/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError('Nem sikerült betölteni a rejtvényt.'));
  }
  useEffect(load, [id]);

  async function handleSolved() {
    if (!session?.user) return;
    const res = await fetch(`/api/community/${encodeURIComponent(id)}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: data.puzzle.answer }),
    }).catch(() => null);
    if (res?.ok) {
      setData((d) => ({ ...d, mine: { ...d.mine, solved: true } }));
      onChanged && onChanged({ solved: true });
    }
  }

  async function rate(patch) {
    const res = await fetch(`/api/community/${encodeURIComponent(id)}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setData((d) => ({
        ...d,
        avg: out.avg,
        ratingCount: out.ratingCount,
        reactions: out.reactions,
        mine: { ...d.mine, ...('stars' in patch ? { stars: patch.stars } : {}), ...('reaction' in patch ? { reaction: patch.reaction } : {}) },
      }));
      onChanged && onChanged({ avg: out.avg, ratingCount: out.ratingCount });
    } else {
      setMsg(out.message || 'Nem sikerült menteni.');
    }
  }

  async function promote() {
    if (!confirm('Biztosan beemeled ezt a titkosírást a fő listába? A sor végére kerül egy másolata, a közösségi rejtvény is megmarad.')) return;
    const res = await fetch('/api/admin/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setMsg('Beemelve a fő lista végére. A beküldő értesítést kapott.');
      setData((d) => ({ ...d, puzzle: { ...d.puzzle, promoted: true } }));
      onChanged && onChanged({ promoted: true });
    } else if (res?.status === 401) {
      setMsg('Ehhez admin belépés kell: lépj be az admin felületen az admin jelszóval.');
    } else {
      setMsg(out.message || 'Nem sikerült a beemelés.');
    }
  }

  // Megosztás vágólapra másolással (mint a főoldalon az eredményé): egy rövid szöveg és a link.
  // A link nem külön oldal: a közösségi oldal címe a rejtvény meglévő azonosítójával (?r=),
  // így semmi nem tárolódik hozzá, és megnyitva az oldal ezt a rejtvényt nyitja le.
  async function share() {
    const url = `${window.location.origin}/kozossegi?r=${encodeURIComponent(id)}`;
    // Négy sor: a felhívás, a rejtvény a betűszámmal, az átlagértékelés csillagokkal, a link.
    const avg = data?.avg;
    const stars = avg != null ? `${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))} (${avg.toLocaleString('hu-HU')})` : 'Még nincs értékelése - legyél az első!';
    const enumeration = data?.puzzle?.enumeration || enumerationFor(data?.puzzle?.answer || '');
    const text = `Fejtsd meg ezt a közösségi titkosírást:\n„${data?.puzzle?.clue || ''}” ${enumeration}\n${stars}\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Kimásoltuk a linket, beillesztheted bárhová.');
    } catch {
      setMsg(`Másold ki a linket: ${url}`);
    }
  }

  // Törlés (az admin bármelyiket, a beküldő a sajátját), mindig visszakérdezéssel.
  async function remove() {
    const who = data?.isOwner ? 'a titkosírásodat' : 'ezt a közösségi titkosírást';
    if (!confirm(`Biztosan törlöd ${who}? Az értékelései és a reakciói is törlődnek, és nem vonható vissza.`)) return;
    const res = await fetch(`/api/community/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) onDeleted && onDeleted();
    else setMsg(res?.status === 403 ? 'Ehhez admin belépés kell: lépj be az admin felületen az admin jelszóval.' : 'Nem sikerült a törlés.');
  }

  if (error) return <div className="community-detail">{error}</div>;
  if (!data)
    return (
      <div className="community-detail">
        <div className="community-loading" role="status">
          <span className="loading-dots" aria-hidden="true"><i /><i /><i /></span>
          A titkosírás betöltése…
        </div>
      </div>
    );
  // Vendég: csak előnézet (a rejtvény szövege, betűszáma, értékelése), megfejteni nem lehet.
  if (data.preview) {
    const pv = data.puzzle;
    return (
      <div className="community-detail">
        <div className="topbar-sub player-sub">
          <span>{formatHuDay(pv.createdAt)}</span>
          {pv.submittedBy && <span className="submitted-by">Beküldte: {pv.submittedBy}</span>}
        </div>
        <div className="clue-box" style={{ marginBottom: 10 }}>
          <div className="clue-text">
            {pv.clue} <span className="clue-enum">{pv.enumeration}</span>
          </div>
        </div>
        <div className="community-rate community-rate-summary">
          <div className="community-rate-title">Értékelés</div>
          {data.avg != null ? (
            <div className="community-rating">
              <Stars value={data.avg} size={20} />
              <span>
                {data.avg.toLocaleString('hu-HU')} ({data.ratingCount} értékelés)
              </span>
            </div>
          ) : (
            <div className="community-rate-sum">Még nincs értékelése.</div>
          )}
          <p className="community-rate-note">
            A megfejtéshez és az értékeléshez{' '}
            <a href={`/login?callbackUrl=${encodeURIComponent(`/kozossegi?r=${id}`)}`}>jelentkezz be vagy regisztrálj</a> - ingyenes.
          </p>
        </div>
        <div className="community-share">
          <button className="ghost small" type="button" onClick={share}>
            <Icon src="/icons/Megosztas.png" size={14} /> Rejtvény megosztása
          </button>
        </div>
        {msg && (
          <div className="feedback hint" style={{ marginLeft: 0, marginTop: 10 }}>
            {msg}
          </div>
        )}
      </div>
    );
  }

  const { puzzle, mine, emojis, reactions } = data;
  const canRate = data.canRate && mine.solved;

  return (
    <div className="community-detail">
      <PuzzlePlayer puzzle={puzzle} initiallySolved={mine.solved} onSolved={handleSolved} dateLabel={formatHuDay(puzzle.createdAt)} />

      {/* Megfejtés előtt csak az átlagértékelés látszik a megoldó felület alatt, megfejtés után
          az értékelő rész a reakciókkal. */}
      {!mine.solved && (
        <div className="community-rate community-rate-summary">
          <div className="community-rate-title">Értékelés</div>
          {data.avg != null ? (
            <div className="community-rating">
              <Stars value={data.avg} size={20} />
              <span>
                {data.avg.toLocaleString('hu-HU')} ({data.ratingCount} értékelés)
              </span>
            </div>
          ) : (
            <div className="community-rate-sum">Még nincs értékelése.</div>
          )}
          <p className="community-rate-note">Megoldás után értékelheted, és reakciót is adhatsz rá.</p>
        </div>
      )}
      {mine.solved && (
        <div className="community-rate">
          <div className="community-rate-title">Értékeld a titkosírást!</div>
          <div className="star-input" role="group" aria-label="Értékelés csillagokkal">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`star-btn${(mine.stars || 0) >= n ? ' on' : ''}`}
                aria-label={`${n} csillag`}
                aria-pressed={mine.stars === n}
                disabled={!canRate}
                onClick={() => rate({ stars: n })}
              >
                ★
              </button>
            ))}
          </div>
          <div className="community-rate-sum">
            {data.avg != null ? `${data.avg.toLocaleString('hu-HU')} átlag, ${data.ratingCount} értékelés` : 'Még nincs értékelés - legyél te az első!'}
          </div>
          <div className="reaction-row" role="group" aria-label="Reakciók">
            {emojis.map((e, k) => (
              <button
                key={k}
                type="button"
                className={`reaction-btn${mine.reaction === k ? ' on' : ''}`}
                aria-label={`${e} reakció, ${reactions[k]} darab`}
                aria-pressed={mine.reaction === k}
                disabled={!canRate}
                onClick={() => rate({ reaction: mine.reaction === k ? null : k })}
              >
                <span aria-hidden="true">{e}</span>
                {reactions[k] > 0 && <span className="reaction-count">{reactions[k]}</span>}
              </button>
            ))}
          </div>
          {!data.canRate && <p className="community-rate-note">Az értékeléshez erősítsd meg az e-mail-címedet.</p>}
        </div>
      )}

      <div className="community-share">
        <button className="ghost small" type="button" onClick={share}>
          <Icon src="/icons/Megosztas.png" size={14} /> Rejtvény megosztása
        </button>
      </div>

      {(isAdmin || data.isOwner) && (
        <div className="community-admin">
          <div className="community-rate-title">{isAdmin ? 'Admin' : 'A te titkosírásod'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isAdmin && (
              <button className="primary small" type="button" onClick={promote} disabled={puzzle.promoted}>
                {puzzle.promoted ? 'Már a fő listában' : '➕ Beemelés a fő listába'}
              </button>
            )}
            <button className="ghost small" type="button" onClick={remove}>
              Törlés
            </button>
          </div>
        </div>
      )}
      {msg && (
        <div className="feedback hint" style={{ marginLeft: 0, marginTop: 10 }}>
          {msg}
        </div>
      )}
    </div>
  );
}

function formatHuDay(iso) {
  try {
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}
