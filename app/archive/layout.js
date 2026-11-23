// A(z) /archive oldal címe és leírása (böngészőfül, keresők találati szövege).
export const metadata = {
  title: { absolute: 'Napititkos.hu - Korábbi rejtvények' },
  description: 'A korábbi napok titkosírásai, szókeresői, sudokui és heti minijei egy helyen.',
  alternates: { canonical: '/archive' },
  openGraph: { title: 'Napititkos.hu - Korábbi rejtvények', description: 'A korábbi napok titkosírásai, szókeresői, sudokui és heti minijei egy helyen.', url: 'https://napititkos.hu/archive', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
};

export default function Layout({ children }) {
  return children;
}
