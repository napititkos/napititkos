import Logo from './Logo';

// A játékok feliratai (a fejlécben és a főoldali csempéken ugyanazok). A kos a „titkos” és a
// „szó” O-ja helyén áll. A Fredoka betűtípusból hiányzik az Ő, ezért az O fölé rajzoljuk a
// kettős ékezetet; a kos gyűrűjére (Ó) ugyanígy kerül az ékezet.
const Ring = ({ acute = false }) => (
  <span className={`brand-o${acute ? ' brand-o-acute' : ''}`}>
    <Logo size={null} className="brand-o-logo" />
  </span>
);

export function TitkosWordmark() {
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

export function SzoWordmark() {
  return (
    <div className="brand brand-flow brand-c" aria-hidden="true">
      <span className="bf-ink">SZ</span>
      <Ring acute />
      <span className="bf-accent">
        KERES<span className="dbl-acute">O</span>
      </span>
    </div>
  );
}

export function MiniWordmark() {
  return (
    <div className="brand brand-flow brand-heti" aria-hidden="true">
      <span className="bf-ink">HETI</span>
      <span className="bf-accent">MINI</span>
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
    </div>
  );
}
