'use client';

export default function Nav() {
  function handleArchiveClick(e) {
    e.preventDefault();
    alert('Hamarosan érkezik! Dolgozunk rajta. 🚧');
  }

  return (
    <nav className="topnav">
      <a href="/" style={{ textDecoration: 'none' }}>
        <div className="brand">Titkos<span>írás</span></div>
      </a>
      <div className="links">
        <a href="/">Kezdőlap</a>
        <a href="/archive" onClick={handleArchiveClick}>Korábbi titkosírások</a>
        <a href="/help">Súgó</a>
        <a href="/submit">Rejtvény beküldése</a>
        <a href="/contact">Kapcsolat</a>
      </div>
    </nav>
  );
}
