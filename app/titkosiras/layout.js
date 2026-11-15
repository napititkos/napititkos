// A(z) /titkosiras oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Titkosírás – napi kriptikus rejtvény' },
  description: 'Minden nap egy új magyar kriptikus (cryptic) rejtvény: a meghatározásban elrejtett szót kell megfejteni. Tippekkel, ranglistával, korábbi és közösségi rejtvényekkel.',
  alternates: { canonical: '/titkosiras' },
  openGraph: { title: 'Titkosírás – napi kriptikus rejtvény', description: 'Minden nap egy új magyar kriptikus (cryptic) rejtvény: a meghatározásban elrejtett szót kell megfejteni. Tippekkel, ranglistával, korábbi és közösségi rejtvényekkel.', url: 'https://napititkos.hu/titkosiras', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Titkosírás – napi kriptikus rejtvény', description: 'Minden nap egy új magyar kriptikus (cryptic) rejtvény: a meghatározásban elrejtett szót kell megfejteni. Tippekkel, ranglistával, korábbi és közösségi rejtvényekkel.' },
};

export default function Layout({ children }) {
  return children;
}
