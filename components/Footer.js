export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-links">
        <a href="/contact">Kapcsolat</a>
        <span className="dot">·</span>
        <a href="/privacy">Adatvédelem</a>
      </div>
      <div className="site-footer-copy">Titkosírás · napititkos.hu</div>
      <div className="site-footer-copy" style={{ marginTop: 4, opacity: 0.6 }}>
        Ikonok: Dave Gandy, Those Icons, C-mo Box, Magnific, pictranoosa -{' '}
        <a href="https://www.flaticon.com" target="_blank" rel="noopener noreferrer">
          Flaticon
        </a>
      </div>
    </footer>
  );
}
