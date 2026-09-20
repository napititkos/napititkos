export default function PodiumIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="12" width="5.5" height="9" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="9.25" y="6" width="5.5" height="15" rx="1" fill="currentColor" />
      <rect x="16.5" y="15" width="5.5" height="6" rx="1" fill="currentColor" opacity="0.55" />
      <text x="4.75" y="18.5" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="700">2</text>
      <text x="12" y="14.5" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="700">1</text>
      <text x="19.25" y="19.5" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="700">3</text>
    </svg>
  );
}
