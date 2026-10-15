'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CommunityDetail from './CommunityDetail';
import Icon from './Icon';
import ClueLine from './ClueLine';
import { enumerationFor } from '../lib/format';

const SORTS = [
  { key: 'new', label: 'Legfrissebb elöl' },
  { key: 'old', label: 'Legrégebbi elöl' },
  { key: 'best', label: 'Legjobbra értékelt elöl' },
  { key: 'worst', label: 'Leggyengébbre értékelt elöl' },
];

// Csillagok kijelzése (csak megjelenítés): pl. 4,3 -> 4 teli csillag és egy részben teli.
export function Stars({ value, size = 16 }) {
  const pct = Math.max(0, Math.min(5, value || 0)) * 20;
  return (
    <span className="stars" style={{ fontSize: size }} aria-hidden="true">
      <span className="stars-bg">★★★★★</span>
      <span className="stars-fg" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

// Közösségi titkosírások: a játékosok által beküldött rejtvények listája. A lista csak a
// rejtvény szövegét, az értékelést és a beküldőt mutatja; rányomva nyílik meg a megoldó felület.
export default function CommunityPage() {
  const { status } = useSession();
  const [teaser, setTeaser] = useState(null);
  const [preview, setPreview] = useState(null); // vendégnek a megosztott rejtvény előnézete
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('new');
  const [openId, setOpenId] = useState(null);

  function load() {
    fetch('/api/community', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setError('Nem sikerült betölteni a közösségi titkosírásokat.'));
  }
  // Megosztott link (/kozossegi?r=<azonosító>): betöltés után az a rejtvény nyílik meg.
  const [sharedId, setSharedId] = useState(null);
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get('r');
      if (r && /^[A-Za-z0-9_-]{1,80}$/.test(r)) setSharedId(r);
    } catch {}
  }, []);
  useEffect(() => {
    if (!sharedId || !items) return;
    if (items.some((x) => x.id === sharedId)) {
      setOpenId(sharedId);
      setTimeout(() => document.getElementById(`k-${sharedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
    setSharedId(null);
  }, [sharedId, items]);

  useEffect(() => {
    if (status === 'authenticated') load();
    if (status === 'unauthenticated') {
      try {
        const r = new URLSearchParams(window.location.search).get('r');
        if (r && /^[A-Za-z0-9_-]{1,80}$/.test(r)) {
          fetch(`/api/community/${encodeURIComponent(r)}`)
            .then((x) => (x.ok ? x.json() : null))
            .then((d) => d?.preview && setPreview(d))
            .catch(() => {});
        }
      } catch {}
      fetch('/api/community/count')
        .then((r) => r.json())
        .then((d) => setTeaser(d.display || '0'))
        .catch(() => setTeaser(''));
    }
  }, [status]);

  const sorted = useMemo(() => {
    if (!items) return [];
    const by = [...items];
    const t = (x) => Date.parse(x.createdAt) || 0;
    const rating = (x) => (x.avg == null ? -1 : x.avg);
    if (sort === 'new') by.sort((a, b) => t(b) - t(a));
    if (sort === 'old') by.sort((a, b) => t(a) - t(b));
    // Értékelés szerint; azonos átlagnál a több értékelést kapott, majd a frissebb előbb.
    if (sort === 'best') by.sort((a, b) => rating(b) - rating(a) || b.ratingCount - a.ratingCount || t(b) - t(a));
    if (sort === 'worst') by.sort((a, b) => (a.avg == null) - (b.avg == null) || rating(a) - rating(b) || t(b) - t(a));
    return by;
  }, [items, sort]);

  // Vendégeknek csak egy előzetes: hány közösségi titkosírás várja őket regisztráció után.
  if (status !== 'authenticated') {
    return (
      <div className="wrap">
        <h1 className="page-title">Közösségi titkosírások</h1>
        <div className="card community-teaser">
          {status === 'loading' || teaser === null ? (
            <p style={{ margin: 0 }}>Betöltés…</p>
          ) : (
            <>
              {sharedId && (
                <p style={{ marginTop: 0, fontWeight: 700 }}>Valaki megosztott veled egy közösségi titkosírást!</p>
              )}
              {preview && (
                <div className="community-preview">
                  <div className="community-preview-clue">
                    {preview.puzzle.clue} <b>{preview.puzzle.enumeration}</b>
                  </div>
                  <div className="community-meta">
                    {preview.avg != null ? (
                      <span className="community-rating">
                        <Stars value={preview.avg} />
                        <span>
                          {preview.avg.toLocaleString('hu-HU')} ({preview.ratingCount} értékelés)
                        </span>
                      </span>
                    ) : (
                      <span className="community-rating muted">Még nincs értékelés</span>
                    )}
                    <span>
                      Beküldte: <b>{preview.puzzle.submittedBy || 'Névtelen'}</b>
                    </span>
                  </div>
                  <p className="community-preview-note">A megfejtéshez jelentkezz be, vagy regisztrálj - ingyenes.</p>
                </div>
              )}
              {teaser && teaser !== '0' && (
                <div className="community-teaser-count">
                  <b>{teaser}</b> közösségi titkosírás vár rád
                </div>
              )}
              <p>
                A játékosok által írt rejtvények megfejtéséhez, értékeléséhez és saját titkosírásod
                beküldéséhez jelentkezz be, vagy regisztrálj - ingyenes.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={`/login?callbackUrl=${encodeURIComponent('/kozossegi' + (sharedId ? `?r=${sharedId}` : ''))}`} style={{ textDecoration: 'none' }}>
                  <button className="primary" type="button">Bejelentkezés / regisztráció</button>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1 className="page-title">Közösségi titkosírások</h1>
      <a className="community-cta" href="/submit">
        <Icon src="/icons/Rejtveny_bekuldese.png" size={22} className="icon-on-accent" /> Írj te is titkosírást!
      </a>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '4px 2px 14px' }}>
        A játékosok által beküldött rejtvények. Nyomj rá egyre a megfejtéshez - ha megfejtetted,
        értékelheted, és reakciót is adhatsz rá.
      </p>
      <div className="community-sort">
        <label htmlFor="community-sort">Rendezés:</label>
        <select id="community-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="card">{error}</div>}
      {!error && items === null && <div className="card">Betöltés…</div>}
      {items && items.length === 0 && (
        <div className="card">Még nincs közösségi titkosírás. Legyél te az első!</div>
      )}
      {sorted.map((it) => {
        const open = openId === it.id;
        return (
          <div className={`card community-item${open ? ' open' : ''}`} key={it.id} id={`k-${it.id}`}>
            <button
              type="button"
              className="community-head"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : it.id)}
            >
              <ClueLine text={it.clue} className="community-clue" />
              <span className="community-meta">
                {it.avg != null ? (
                  <span className="community-rating">
                    <Stars value={it.avg} />
                    <span>
                      {it.avg.toLocaleString('hu-HU')} ({it.ratingCount} értékelés)
                    </span>
                  </span>
                ) : (
                  <span className="community-rating muted">Még nincs értékelés</span>
                )}
                <span>
                  Beküldte: <b>{it.name || 'Névtelen'}</b> · {formatDate(it.createdAt)}
                </span>
                {it.promoted && <span className="community-badge">Bekerült a napi titkosírások közé</span>}
              </span>
            </button>
            {open && (
              <CommunityDetail
                id={it.id}
                onChanged={(patch) => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, ...patch } : x)))}
                onDeleted={() => {
                  setOpenId(null);
                  setItems((prev) => prev.filter((x) => x.id !== it.id));
                }}
              />
            )}
          </div>
        );
      })}
      {items && (
        <div className="back-home-row">
          <a href="/" className="back-home-btn">← Vissza a főoldalra</a>
        </div>
      )}
    </div>
  );
}
