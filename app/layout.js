import './globals.css';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import AchievementsModal from '../components/AchievementsModal';
import LeaderboardModal from '../components/LeaderboardModal';
import TutorialModal from '../components/TutorialModal';
import AuthProvider from '../components/AuthProvider';
import ProgressSync from '../components/ProgressSync';
import { Analytics } from '@vercel/analytics/next';

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
    <html lang="hu">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
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
