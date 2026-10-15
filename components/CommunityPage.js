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

export { Stars } from './Stars';
import { Stars } from './Stars';

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
  const [sharedLink, setSharedLink] = useState(null); // megmarad a bejelentkezés linkjéhez
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get('r');
      if (r && /^[A-Za-z0-9_-]{1,80}$/.test(r)) {
        setSharedId(r);
        setSharedLink(r);
      }
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
    // A lista vendégeknek is betöltődik (megfejteni csak bejelentkezve lehet).
    if (status !== 'loading') load();
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

  return (
    <div className="wrap">
      <div className="page-title-row">
        <h1 className="page-title">Közösségi titkosírások</h1>
        <a href="/" className="back-home-btn">← Főoldal</a>
      </div>
      <a className="community-cta" href="/submit">
        <Icon src="/icons/Rejtveny_bekuldese.png" size={22} className="icon-on-accent" /> Írj te is titkosírást!
      </a>
      {status === 'unauthenticated' && (
        <div className="community-guest-note">
          {sharedLink && <b>Valaki megosztott veled egy közösségi titkosírást! </b>}
          A rejtvényeket bárki megnézheti; megfejteni, értékelni és saját titkosírást beküldeni
          bejelentkezve tudsz.{' '}
          <a href={`/login?callbackUrl=${encodeURIComponent('/kozossegi' + (sharedLink ? `?r=${sharedLink}` : ''))}`}>
            Bejelentkezés / regisztráció
          </a>
        </div>
      )}
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
            {/* Lenyitva a fejléc helyén csak egy keskeny bezáró sáv marad: a rejtvény szövege,
                dátuma, beküldője és értékelése ilyenkor a megoldó felületen jelenik meg. */}
            {open ? (
              <button type="button" className="community-close" aria-expanded={true} onClick={() => setOpenId(null)}>
                ▴ Bezárás
              </button>
            ) : (
              <button type="button" className="community-head" aria-expanded={false} onClick={() => setOpenId(it.id)}>
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
            )}
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
    </div>
  );
}
