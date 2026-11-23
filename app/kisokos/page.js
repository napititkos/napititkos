import TrackHelpVisit from '../../components/TrackHelpVisit';
import KisokosTabs from '../../components/KisokosTabs';

export const metadata = {
  title: { absolute: 'Napititkos.hu - Kisokos' },
  description: 'Interaktív bevezető a kriptikus rejtvényekhez (kezdetek, betűjáték, szójáték, joker), a szókeresőhöz, a sudokuhoz és a mini keresztrejtvényhez.',
  alternates: { canonical: '/kisokos' },
  openGraph: { title: 'Napititkos.hu - Kisokos', description: 'Interaktív bevezető a kriptikus rejtvényekhez (kezdetek, betűjáték, szójáték, joker), a szókeresőhöz, a sudokuhoz és a mini keresztrejtvényhez.', url: 'https://napititkos.hu/kisokos', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
};

// A Kisokos (korábban: Tutorial). A régi /tutorial és /help címek ide irányítanak át.
export default function KisokosPage() {
  return (
    <div className="wrap">
      <h1 className="sr-only">Kisokos</h1>
      <TrackHelpVisit />
      <KisokosTabs />
    </div>
  );
}
