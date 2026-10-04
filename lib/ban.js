import { kv } from './kv';

// Fióktiltás. A tiltást a fiók rekordján tároljuk (au:user:<id>.banned), és mindig élőben,
// az adatbázisból olvassuk - nem a munkamenetből -, így a tiltás azonnal érvényes, a már
// bejelentkezett eszközökön is (ugyanaz az elv, mint az admin jog élő ellenőrzésénél).
// Redis-hiba esetén nem tiltunk (fail-open), hogy egy adatbázis-kiesés ne léptessen ki mindenkit.

export function isBannedRecord(user) {
  return !!user?.banned;
}

export async function isBannedId(id) {
  if (!id || typeof id !== 'string') return false;
  try {
    return isBannedRecord(await kv.get(`au:user:${id}`));
  } catch (err) {
    console.error('Tiltás-ellenőrzési hiba:', err.message);
    return false;
  }
}

export async function isBannedEmail(email) {
  if (!email || typeof email !== 'string') return false;
  try {
    const norm = email.toLowerCase().trim();
    const id = (await kv.get(`au:userByEmail:${email}`)) || (norm !== email ? await kv.get(`au:userByEmail:${norm}`) : null);
    return id ? isBannedId(id) : false;
  } catch (err) {
    console.error('Tiltás-ellenőrzési hiba:', err.message);
    return false;
  }
}
