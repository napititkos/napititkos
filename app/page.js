import { miniLive } from '../lib/mini';
import DailyGame from '../components/DailyGame';
import Hub from '../components/Hub';

// Kezdőlap. Élesítés előtt (MINI_START) a napi titkosírás; utána a három játék csempéje
// (a napi titkosírás a /titkosiras címre költözik).
export const dynamic = 'force-dynamic';

// A főoldal címsora (böngészőfül): napititkos.hu
export const metadata = {
  title: { absolute: 'Napititkos.hu - Minden nap új rejtvények!' },
  description: 'Napititkos.hu - Minden nap új rejtvények! Kriptikus rejtvény, Szókereső, Sudoku, Mini keresztrejtvény',
  alternates: { canonical: '/' },
  openGraph: { title: 'Napititkos.hu - Minden nap új rejtvények!', description: 'Napititkos.hu - Minden nap új rejtvények! Kriptikus rejtvény, Szókereső, Sudoku, Mini keresztrejtvény', url: 'https://napititkos.hu', siteName: 'napititkos.hu', locale: 'hu_HU', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Napititkos.hu - Minden nap új rejtvények!', description: 'Napititkos.hu - Minden nap új rejtvények! Kriptikus rejtvény, Szókereső, Sudoku, Mini keresztrejtvény' },
};

export default function HomePage() {
  return miniLive() ? <Hub /> : <DailyGame />;
}
