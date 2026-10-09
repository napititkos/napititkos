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

// A munkamenet érvényes-e még: tiltott fióknál nem, és akkor sem, ha a munkamenet a fiók
// legutóbbi jelszócseréje (sessionsValidAfter) előtt jött létre. Egyetlen olvasás a fiókról.
// issuedAtMs: a bejelentkezés ideje ezredmásodpercben (a token authAt mezője; régebbi
// tokeneknél a kiállítás ideje, iat * 1000). A belépés pillanatában még nincs ilyen.
export async function isSessionRevoked(id, issuedAtMs) {
  if (!id || typeof id !== 'string') return false;
  try {
    const user = await kv.get(`au:user:${id}`);
    if (isBannedRecord(user)) return true;
    const after = Number(user?.sessionsValidAfter) || 0;
    return !!after && typeof issuedAtMs === 'number' && issuedAtMs < after;
  } catch (err) {
    console.error('Tiltás-ellenőrzési hiba:', err.message);
    return false;
  }
}

// A munkamenet állapota egyetlen olvasással: megszűnt-e (tiltás vagy jelszócsere miatt), és
// meg van-e erősítve a fiók e-mail-címe. Így a megerősítés a már futó munkamenetben is azonnal
// érvényes (nem kell hozzá újra belépni). Redis-hiba esetén nem nyúl a munkamenethez.
export async function sessionStatus(id, issuedAtMs) {
  if (!id || typeof id !== 'string') return { revoked: false, verified: undefined };
  try {
    const user = await kv.get(`au:user:${id}`);
    if (!user) return { revoked: false, verified: undefined };
    const after = Number(user.sessionsValidAfter) || 0;
    const revoked = isBannedRecord(user) || (!!after && typeof issuedAtMs === 'number' && issuedAtMs < after);
    return { revoked, verified: !!user.emailVerified };
  } catch (err) {
    console.error('Munkamenet-ellenőrzési hiba:', err.message);
    return { revoked: false, verified: undefined };
  }
}
