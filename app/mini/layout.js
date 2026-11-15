// A(z) /mini oldal címe és leírása (böngészőfül, keresők találati szövege, megosztás). A
// megosztási képet az opengraph-image.js adja.
export const metadata = {
  title: { absolute: 'Heti Mini keresztrejtvény – napititkos.hu' },
  description: 'Minden héten egy új 5×5-ös mini keresztrejtvény magyar meghatározásokkal. Fejtsd meg minél gyorsabban, és kerülj fel a heti ranglistára!',
  alternates: { canonical: '/mini' },
  openGraph: { title: 'Heti Mini keresztrejtvény – napititkos.hu', description: 'Minden héten egy új 5×5-ös mini keresztrejtvény magyar meghatározásokkal. Fejtsd meg minél gyorsabban, és kerülj fel a heti ranglistára!', url: 'https://napititkos.hu/mini', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Heti Mini keresztrejtvény – napititkos.hu', description: 'Minden héten egy új 5×5-ös mini keresztrejtvény magyar meghatározásokkal. Fejtsd meg minél gyorsabban, és kerülj fel a heti ranglistára!' },
};

export default function Layout({ children }) {
  return children;
}
