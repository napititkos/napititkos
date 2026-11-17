export default function Footer() {
  return (
    <footer className="site-footer">
      {/* A keresők találati szövegébe a lábléc ne kerüljön (a jelölés div-en érvényes). */}
      <div data-nosnippet="">
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
        {' · '}Logó: bundaskifli{' · '}Emoji:{' '}
        <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener noreferrer">
          Twemoji
        </a>{' '}
        (CC-BY 4.0)
      </div>
      </div>
    </footer>
  );
}
