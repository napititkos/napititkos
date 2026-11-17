// A(z) /mini oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Napititkos.hu - Minden héten új Mini Keresztrejtvény' },
  description: 'Napititkos.hu - Minden héten új Mini Keresztrejtvény',
  alternates: { canonical: '/mini' },
  openGraph: { title: 'Napititkos.hu - Minden héten új Mini Keresztrejtvény', description: 'Napititkos.hu - Minden héten új Mini Keresztrejtvény', url: 'https://napititkos.hu/mini', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Napititkos.hu - Minden héten új Mini Keresztrejtvény', description: 'Napititkos.hu - Minden héten új Mini Keresztrejtvény' },
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
