import { miniLive } from '../lib/mini';
import DailyGame from '../components/DailyGame';
import Hub from '../components/Hub';

// Kezdőlap. Élesítés előtt (MINI_START) a napi titkosírás; utána a három játék csempéje
// (a napi titkosírás a /titkosiras címre költözik).
export const dynamic = 'force-dynamic';

// A főoldal címsora (böngészőfül): napititkos.hu
export const metadata = {
  title: { absolute: 'napititkos.hu' },
  description: 'Napi magyar rejtvények egy helyen: kriptikus Titkosírás, Szókereső, 6×6-os és 9×9-es Sudoku és Heti Mini keresztrejtvény. Minden nap új feladványok, ranglistával és trófeákkal.',
  alternates: { canonical: '/' },
  openGraph: { title: 'napititkos.hu – napi magyar rejtvények', description: 'Napi magyar rejtvények egy helyen: kriptikus Titkosírás, Szókereső, 6×6-os és 9×9-es Sudoku és Heti Mini keresztrejtvény. Minden nap új feladványok, ranglistával és trófeákkal.', url: 'https://napititkos.hu', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'napititkos.hu – napi magyar rejtvények', description: 'Napi magyar rejtvények egy helyen: kriptikus Titkosírás, Szókereső, 6×6-os és 9×9-es Sudoku és Heti Mini keresztrejtvény. Minden nap új feladványok, ranglistával és trófeákkal.' },
};

export default function HomePage() {
  return miniLive() ? <Hub /> : <DailyGame />;
}
