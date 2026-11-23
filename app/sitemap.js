export default function sitemap() {
  const baseUrl = 'https://napititkos.hu';
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    // A játékok oldalai (eddig hiányoztak, ezért a kereső nem mindig a megfelelő oldalt adta).
    { url: `${baseUrl}/titkosiras`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/szokereso`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/szolanc`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/sudoku`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/mini`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/kozossegi`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/kisokos`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/archive`, lastModified: now, changeFrequency: 'daily', priority: 0.4 },
  ];
}
