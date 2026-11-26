// A Titkosírás logója (public/logo-*.png, átlátszó háttérrel). A méretet a size (px) adja,
// vagy ha az null, a szülő CSS-e (pl. a fejlécben em-ben, a felirathoz igazítva). A kép
// méretváltozatai: 96, 192, 384 px - a böngésző a kijelző sűrűségéhez illőt tölti be.
export default function Logo({ size = 32, className = '', style }) {
  return (
    <span
      className={`logo-placeholder ${className}`.trim()}
      style={typeof size === 'number' ? { width: size, height: size, ...style } : style}
      aria-hidden="true"
    >
      <img
        className="site-logo"
        src="/logo-96.png"
        srcSet="/logo-96.png 96w, /logo-192.png 192w, /logo-384.png 384w"
        sizes={typeof size === 'number' ? `${size}px` : '64px'}
        alt=""
        draggable={false}
      />
      {/* December 1–25.: a sapkás kos (a sapka a kör fölé nyúlik; a CSS váltja a kettőt). */}
      <img
        className="site-logo-xmas"
        src="/logo-xmas-96.png"
        srcSet="/logo-xmas-96.png 96w, /logo-xmas-192.png 192w, /logo-xmas-384.png 384w"
        sizes={typeof size === 'number' ? `${size}px` : '64px'}
        alt=""
        loading="lazy"
        draggable={false}
      />
    </span>
  );
}
