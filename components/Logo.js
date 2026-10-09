// A Titkosírás logója. Amíg a végleges logó nem érkezik meg, egy kör alakú helyőrző:
// a végleges képnél elég ezt az egy komponenst lecserélni (pl. <img src="/logo.svg">),
// a méretezés (size, px; null esetén a CSS adja) és az elhelyezés mindenhol ugyanaz marad.
export default function Logo({ size = 32, className = '', style }) {
  return (
    <span
      className={`logo-placeholder ${className}`.trim()}
      style={typeof size === 'number' ? { width: size, height: size, ...style } : style}
      aria-hidden="true"
    />
  );
}
