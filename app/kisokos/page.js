import TrackHelpVisit from '../../components/TrackHelpVisit';
import KisokosTabs from '../../components/KisokosTabs';

export const metadata = {
  title: 'Kisokos - Titkosírás',
  description: 'Interaktív bevezető a kriptikus rejtvényekhez (kezdetek, betűjáték, szójáték, joker) és a mini keresztrejtvényhez.',
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
