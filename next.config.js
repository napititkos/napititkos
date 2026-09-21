const isProd = process.env.NODE_ENV === 'production';

// Tartalombiztonsági szabályzat. A szkriptekhez 'unsafe-inline' kell, mert az oldalak
// statikusan generáltak (nonce-hoz minden oldalt dinamikussá kellene tenni), de külső
// szkriptforrást, beágyazást (frame-ancestors) és külső űrlapcélt így is tiltunk.
// A Vercel Analytics szkriptje és a küldött adatok is a saját domainről mennek (/_vercel/...).
// Fejlesztésben (next dev) nem alkalmazzuk, mert ott 'unsafe-eval' kellene.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // A konfetti-animáció (canvas-confetti) blob-ból indított Web Workert használ.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  ...(isProd ? [{ key: 'Content-Security-Policy', value: csp }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Ezeket ne indexelje a keresőmotor.
      {
        source: '/(admin|login|stats|account)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

module.exports = nextConfig;
