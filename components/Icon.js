export default function Icon({ src, size = 18, alt = '', style = {}, className = '' }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`icon-img ${className}`.trim()}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  );
}
