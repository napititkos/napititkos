// A(z) /sudoku oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Napititkos.hu - Minden nap új sudoku!' },
  description: 'Napititkos.hu - Minden nap új sudoku!',
  alternates: { canonical: '/sudoku' },
  openGraph: { title: 'Napititkos.hu - Minden nap új sudoku!', description: 'Napititkos.hu - Minden nap új sudoku!', url: 'https://napititkos.hu/sudoku', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Napititkos.hu - Minden nap új sudoku!', description: 'Napititkos.hu - Minden nap új sudoku!' },
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
