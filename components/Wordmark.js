import Logo from './Logo';

// A játékok feliratai. A kos a „titkos” / „szó” / „kisokos” O-ja helyén áll; a Heti Mininél a két
// szó között (kisebb kerettel, hogy ne lehessen O-nak olvasni). A Fredoka betűtípusból hiányzik az
// Ő, ezért az ékezeteket magából a betűtípus Ó betűjéből vágjuk ki (csak az ékezet látszik belőle),
// így pontosan olyanok, mint a TITKOSÍRÁS Í és Á ékezetei.
const Ring = ({ acute = false, umlaut = false, small = false, bare = false }) => (
  <span className={`brand-o${small ? ' brand-o-small' : ''}${bare ? ' brand-o-bare' : ''}`}>
    <Logo size={null} className="brand-o-logo" />
    {acute && <Accent />}
    {umlaut && <Accent ch="Ö" cls="acc-uml" />}
  </span>
);

// A betűtípus Ó ékezete (a betű alsó része levágva).
const Accent = ({ cls = '', ch = 'Ó' }) => (
  <span className={`acc-clip ${cls}`} aria-hidden="true">
    <span>{ch}</span>
  </span>
);

// Ő: O + két kivágott ékezet (a kettős ékezet).
export const ODbl = () => (
  <span className="acc-letter">
    O
    <Accent cls="acc-l" />
    <Accent cls="acc-r" />
  </span>
);

export function TitkosWordmark({ ring = true }) {
  if (!ring)
    return (
      <div className="brand brand-flow brand-plain" aria-hidden="true">
        <span className="bf-ink">TITKOS</span>
        <span className="bf-accent">ÍRÁS</span>
      </div>
    );
  return (
    <div className="brand brand-mid brand-c" aria-hidden="true">
      <span className="bm-left">TITK</span>
      <Ring />
      <span className="bm-right">
        S<span>ÍRÁS</span>
      </span>
    </div>
  );
}

export function SzoWordmark({ ring = true }) {
  return (
    <div className={`brand brand-flow${ring ? ' brand-c' : ' brand-plain'}`} aria-hidden="true">
      {ring ? (
        <>
          <span className="bf-ink">SZ</span>
          <Ring acute />
        </>
      ) : (
        <span className="bf-ink">SZÓ</span>
      )}
      <span className="bf-accent">
        KERES
        <ODbl />
      </span>
    </div>
  );
}

export function MiniWordmark({ ring = true }) {
  if (!ring)
    return (
      <div className="brand brand-flow brand-heti brand-plain" aria-hidden="true">
        <span className="bf-ink">HETI</span>
        <span className="bf-accent">MINI</span>
      </div>
    );
  // A fejlécben: a kos középen, ugyanott és ugyanakkora, mint a TITKOSÍRÁS-ban, csak keret nélkül
  // (nem O betű), a két szó mellette, ugyanakkora betűkkel.
  return (
    <div className="brand brand-mid brand-c" aria-hidden="true">
      <span className="bm-left">HETI</span>
      <Ring bare />
      <span className="bm-right">
        <span>MINI</span>
      </span>
    </div>
  );
}

// Ugyanabban az elrendezésben és méretben, mint a TITKOSÍRÁS: a kos-O ugyanakkora és ugyanott áll.
export function KisokosWordmark() {
  return (
    <div className="brand brand-mid brand-c" aria-hidden="true">
      <span className="bm-left">KIS</span>
      <Ring />
      <span className="bm-right">
        <span>KOS</span>
      </span>
    </div>
  );
}

export function NapiWordmark() {
  return (
    <div className="brand brand-flow brand-c" aria-hidden="true">
      <span className="bf-accent">NAPI</span>
      <span className="bf-ink">TITK</span>
      <Ring />
      <span className="bf-ink">S</span>
      <span className="bf-accent bf-tld">.HU</span>
    </div>
  );
}

// Korábbi rejtvények: szélesebb kijelzőn KORÁBBI REJTVÉNYEK, keskenyen KORÁBBIAK (a kos az O
// helyén). A kettő közül a CSS választja ki azt, ami elfér.
export function KorabbiWordmark() {
  return (
    <div className="brand brand-flow brand-c brand-korabbi" aria-hidden="true">
      <span className="bf-ink">K</span>
      <Ring />
      <span className="bf-ink">RÁBBI</span>
      <span className="bf-accent kor-long">&nbsp;REJTVÉNYEK</span>
      <span className="bf-accent kor-short">AK</span>
    </div>
  );
}

// PROFIL: a TITKOSÍRÁS és a KISOKOS méretében, a kos az O helyén.
export function ProfilWordmark() {
  return (
    <div className="brand brand-mid brand-c" aria-hidden="true">
      <span className="bm-left">PR</span>
      <Ring />
      <span className="bm-right">
        <span>FIL</span>
      </span>
    </div>
  );
}

// KÖZÖSSÉGI: a második Ö a kos (a gyűrű fölött a betűtípus Ö-jének két pontja), a TITKOSÍRÁS
// méretében és elrendezésében.
export function KozossegiWordmark() {
  return (
    <div className="brand brand-mid brand-c" aria-hidden="true">
      <span className="bm-left">KÖZ</span>
      <Ring umlaut />
      <span className="bm-right">
        <span>SSÉGI</span>
      </span>
    </div>
  );
}
