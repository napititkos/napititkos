import './globals.css';
import Nav from '../components/Nav';

export const metadata = {
  metadataBase: new URL('https://napititkos.hu'),
  title: 'Titkosírás — napi kriptikus rejtvény',
  description: 'Napi magyar nyelvű kriptikus (cryptic) szórejtvény — napititkos.hu',
  openGraph: {
    title: 'Titkosírás — napi kriptikus rejtvény',
    description: 'Napi magyar nyelvű kriptikus (cryptic) szórejtvény.',
    url: 'https://napititkos.hu',
    siteName: 'Titkosírás',
    locale: 'hu_HU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Titkosírás — napi kriptikus rejtvény',
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
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
