// Webalkalmazás-leíró: a nagy felbontású ikonokat innen veszi a böngésző (pl. az Android
// Chrome kezdőlapi csempéje és a kezdőképernyőre tett ikon), így a logó nagyban, körbevágva
// jelenik meg, nem egy kis favicon egy nagy dobozban.
export default function manifest() {
  return {
    name: 'Titkosírás - napi kriptikus rejtvény',
    short_name: 'Titkosírás',
    description: 'Minden nap új kriptikus rejtvény.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F0F0FC',
    theme_color: '#A98CBA',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
