import { miniLive } from '../lib/mini';
import DailyGame from '../components/DailyGame';
import Hub from '../components/Hub';

// Kezdőlap. Élesítés előtt (MINI_START) a napi titkosírás; utána a három játék csempéje
// (a napi titkosírás a /titkosiras címre költözik).
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return miniLive() ? <Hub /> : <DailyGame />;
}
