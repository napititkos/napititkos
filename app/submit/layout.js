// A(z) /submit oldal címe és leírása (böngészőfül, keresők találati szövege).
export const metadata = {
  title: { absolute: 'Napititkos.hu - Rejtvény beküldése' },
  description: 'Küldd be a saját titkosírásodat: a legjobbak bekerülnek a napi rejtvények közé.',
  alternates: { canonical: '/submit' },
  openGraph: { title: 'Napititkos.hu - Rejtvény beküldése', description: 'Küldd be a saját titkosírásodat: a legjobbak bekerülnek a napi rejtvények közé.', url: 'https://napititkos.hu/submit', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
};

export default function Layout({ children }) {
  return children;
}
