// A(z) /szokereso oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Napi szókereső – napititkos.hu' },
  description: 'Minden nap új 3×3-as betűrács: húzd össze a szomszédos betűket, és találd meg az összes rejtett szót, köztük a napi 9 betűs szót. Pontok, segítségek és napi ranglista.',
  alternates: { canonical: '/szokereso' },
  openGraph: { title: 'Napi szókereső – napititkos.hu', description: 'Minden nap új 3×3-as betűrács: húzd össze a szomszédos betűket, és találd meg az összes rejtett szót, köztük a napi 9 betűs szót. Pontok, segítségek és napi ranglista.', url: 'https://napititkos.hu/szokereso', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Napi szókereső – napititkos.hu', description: 'Minden nap új 3×3-as betűrács: húzd össze a szomszédos betűket, és találd meg az összes rejtett szót, köztük a napi 9 betűs szót. Pontok, segítségek és napi ranglista.' },
};

export default function Layout({ children }) {
  return children;
}
