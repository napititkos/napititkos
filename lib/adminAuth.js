import { auth } from '../auth';
import { kv } from './kv';
import { adminCookieName, readAdminToken } from './adminSession';

// Admin jogú fiók (a szerepkört mindig élőben, az adatbázisból olvassuk - nem a
// munkamenetből -, így ha valakitől elveszik a jogot, azonnal kizárul).
export async function adminUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await kv.get(`au:user:${id}`);
  return user?.role === 'admin' ? user : null;
}

// Az admin API-khoz MINDHÁROM kell:
//  1. érvényes admin munkamenet-süti (az admin jelszóval szerezhető, 8 óráig él),
//  2. ugyanaz a bejelentkezett fiók, amelyik a munkamenetet indította,
//  3. ennek a fióknak jelenleg is admin joga van.
export async function isAdminRequest(req) {
  const payload = readAdminToken(req?.cookies?.get?.(adminCookieName())?.value);
  if (!payload?.uid) return false;
  const user = await adminUser();
  return !!user && user.id === payload.uid;
}
