import BackButton from '../../components/BackButton';
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
      <div className="page-title-row">
        <h1 className="page-title">Kisokos</h1>
        <BackButton />
      </div>
      <TrackHelpVisit />
      <KisokosTabs />
    </div>
  );
}
