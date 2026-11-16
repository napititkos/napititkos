// A(z) /szokereso oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Napititkos.hu - Minden nap új szókereső!' },
  description: 'Napititkos.hu - Minden nap új szókereső!',
  alternates: { canonical: '/szokereso' },
  openGraph: { title: 'Napititkos.hu - Minden nap új szókereső!', description: 'Napititkos.hu - Minden nap új szókereső!', url: 'https://napititkos.hu/szokereso', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Napititkos.hu - Minden nap új szókereső!', description: 'Napititkos.hu - Minden nap új szókereső!' },
};

export default function Layout({ children }) {
  return children;
}
