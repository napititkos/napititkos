import './globals.css';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import AchievementsModal from '../components/AchievementsModal';
import LeaderboardModal from '../components/LeaderboardModal';
import TutorialModal from '../components/TutorialModal';
import AuthProvider from '../components/AuthProvider';
import ProgressSync from '../components/ProgressSync';
import { Analytics } from '@vercel/analytics/next';
import { Baloo_2, Fredoka, Nunito } from 'next/font/google';

// A betűtípusokat a build tölti le és a saját domainünkről szolgáljuk ki, így a
// látogatók IP-címe nem kerül a Google-hoz (GDPR), és nincs külső, renderblokkoló CSS.
// A latin-ext kell a magyar ő és ű betűkhöz.
const fredoka = Fredoka({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700'], display: 'swap', variable: '--font-fredoka' });
const baloo = Baloo_2({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700', '800'], display: 'swap', variable: '--font-baloo' });
const nunito = Nunito({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--font-nunito' });

export const metadata = {
  metadataBase: new URL('https://napititkos.hu'),
  title: 'Titkosírás - napi kriptikus rejtvény',
  description: 'Napi magyar nyelvű kriptikus (cryptic) szórejtvény - napititkos.hu',
  openGraph: {
    title: 'Titkosírás - napi kriptikus rejtvény',
    description: 'Napi magyar nyelvű kriptikus (cryptic) szórejtvény.',
    url: 'https://napititkos.hu',
    siteName: 'Titkosírás',
    locale: 'hu_HU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Titkosírás - napi kriptikus rejtvény',
    description: 'Napi magyar nyelvű kriptikus (cryptic) szórejtvény.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu" className={`${fredoka.variable} ${baloo.variable} ${nunito.variable}`}>
      <body>
        <AuthProvider>
          <ProgressSync />
          <Nav />
          {children}
          <Footer />
          <AchievementsModal />
          <LeaderboardModal />
          <TutorialModal />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
