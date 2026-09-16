'use client';

export default function Nav() {
  function handleArchiveClick(e) {
    e.preventDefault();
    alert('Hamarosan érkezik! Dolgozunk rajta. 🚧');
  }
  function handleTutorialClick(e) {
    e.preventDefault();
    alert('Építés alatt! Hamarosan érkezik a tutorial. 🚧');
  }

  return (
    <>
      <nav className="topnav">
        <a href="/" style={{ textDecoration: 'none' }}>
          <div className="brand">Titkos<span>írás</span></div>
        </a>
        <a href="#" onClick={handleTutorialClick} className="tutorial-badge">
          ✨ Tutorial
        </a>
      </nav>
      <div className="topnav" style={{ paddingTop: 0 }}>
        <div className="links">
          <a href="/">Kezdőlap</a>
          <a href="/archive" onClick={handleArchiveClick}>Korábbi titkosírások</a>
          <a href="/help">Súgó</a>
          <a href="/submit">Rejtvény beküldése</a>
        </div>
      </div>
    </>
  );
}
