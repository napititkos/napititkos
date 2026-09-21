// A levelekbe kerülő linkek alapcíme. Szándékosan NEM a kérés Origin/Host
// fejlécéből származik, mert azt a támadó szabadon megadhatja, és így a
// megerősítő link (és benne a token) egy idegen oldalra mutathatna.
export function getSiteUrl() {
  const fromEnv = process.env.SITE_URL || process.env.AUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === 'production') return 'https://www.napititkos.hu';
  return 'http://localhost:3000';
}
