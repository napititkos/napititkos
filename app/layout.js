import './globals.css';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import AchievementsModal from '../components/AchievementsModal';
import LeaderboardModal from '../components/LeaderboardModal';
import TutorialModal from '../components/TutorialModal';
import AuthProvider from '../components/AuthProvider';
import ProgressSync from '../components/ProgressSync';
import { Analytics } from '@vercel/analytics/next';
import localFont from 'next/font/local';

// A betűtípus-fájlok a repóban vannak (app/fonts, SIL Open Font License), így a build
// semmilyen külső szervert nem hív (a CI nem bukhat el a Google Fonts elérhetőségén), és
// a látogatók IP-címe sem kerül a Google-hoz (GDPR). Latin + latin-ext karakterkészlet
// (a magyar ő és ű betűkhöz), változtatható vastagságú (variable) fájlok.
const fredoka = localFont({ src: './fonts/fredoka.woff2', weight: '300 700', display: 'swap', variable: '--font-fredoka' });
const baloo = localFont({ src: './fonts/baloo2.woff2', weight: '400 800', display: 'swap', variable: '--font-baloo' });
const nunito = localFont({ src: './fonts/nunito.woff2', weight: '200 1000', display: 'swap', variable: '--font-nunito' });

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
