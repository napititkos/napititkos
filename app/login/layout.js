// A(z) /login oldal címe és leírása (böngészőfül, keresők találati szövege).
export const metadata = {
  title: { absolute: 'Napititkos.hu - Bejelentkezés' },
  description: 'Bejelentkezés és regisztráció a napititkos.hu oldalra.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
  openGraph: { title: 'Napititkos.hu - Bejelentkezés', description: 'Bejelentkezés és regisztráció a napititkos.hu oldalra.', url: 'https://napititkos.hu/login', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
};

export default function Layout({ children }) {
  return children;
}
