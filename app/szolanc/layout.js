// A /szolanc oldal címe és leírása (böngészőfül, keresők találati szövege). A leírás a szerveren
// renderelt HTML-ben is benne van, a képernyőn nem látszik.
export const metadata = {
  title: { absolute: 'Napititkos.hu - Minden nap új szólánc!' },
  description: 'Napititkos.hu - Minden nap új szólánc!',
  alternates: { canonical: '/szolanc' },
  openGraph: { title: 'Napititkos.hu - Minden nap új szólánc!', description: 'Napititkos.hu - Minden nap új szólánc!', url: 'https://napititkos.hu/szolanc', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
};

export default function Layout({ children }) {
  return (
    <>
      <p className="sr-only">{metadata.description}</p>
      {children}
    </>
  );
}
