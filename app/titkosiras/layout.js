// A(z) /titkosiras oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Napititkos.hu - Minden nap új kriptikus rejtvény!' },
  description: 'Napititkos.hu - Minden nap új kriptikus rejtvény!',
  alternates: { canonical: '/titkosiras' },
  openGraph: { title: 'Napititkos.hu - Minden nap új kriptikus rejtvény!', description: 'Napititkos.hu - Minden nap új kriptikus rejtvény!', url: 'https://napititkos.hu/titkosiras', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Napititkos.hu - Minden nap új kriptikus rejtvény!', description: 'Napititkos.hu - Minden nap új kriptikus rejtvény!' },
};

// A leírás a szerveren renderelt HTML-ben is benne van (a keresők ezt olvassák elsőként), a
// képernyőn nem látszik.
export default function Layout({ children }) {
  return (
    <>
      <p className="sr-only">{metadata.description}</p>
      {children}
    </>
  );
}
