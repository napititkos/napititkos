// A(z) /sudoku oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Napi Sudoku 6×6 és 9×9 – napititkos.hu' },
  description: 'Minden nap egy új 6×6-os és egy új 9×9-es sudoku, hétfőtől vasárnapig egyre nehezebb. Saját számbillentyűzet, jegyzetek, ütközésjelzés és napi ranglista.',
  alternates: { canonical: '/sudoku' },
  openGraph: { title: 'Napi Sudoku 6×6 és 9×9 – napititkos.hu', description: 'Minden nap egy új 6×6-os és egy új 9×9-es sudoku, hétfőtől vasárnapig egyre nehezebb. Saját számbillentyűzet, jegyzetek, ütközésjelzés és napi ranglista.', url: 'https://napititkos.hu/sudoku', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Napi Sudoku 6×6 és 9×9 – napititkos.hu', description: 'Minden nap egy új 6×6-os és egy új 9×9-es sudoku, hétfőtől vasárnapig egyre nehezebb. Saját számbillentyűzet, jegyzetek, ütközésjelzés és napi ranglista.' },
};

export default function Layout({ children }) {
  return children;
}
