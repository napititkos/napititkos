import CommunityPage from '../../components/CommunityPage';

export const metadata = {
  title: { absolute: 'Napititkos.hu - Közösségi rejtvények' },
  description: 'A játékosok által beküldött titkosírások és mini keresztrejtvények: fejtsd meg, értékeld, és küldj be te is!',
  alternates: { canonical: '/kozossegi' },
  openGraph: { title: 'Napititkos.hu - Közösségi rejtvények', description: 'A játékosok által beküldött titkosírások és mini keresztrejtvények: fejtsd meg, értékeld, és küldj be te is!', url: 'https://napititkos.hu/kozossegi', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
};

export default function Page() {
  return <CommunityPage />;
}
