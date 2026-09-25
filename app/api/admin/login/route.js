export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { kv } from '../../../../lib/kv';
import { clientIp } from '../../../../lib/rateLimit';
import { auth } from '../../../../auth';
import { adminUser, isAdminRequest } from '../../../../lib/adminAuth';
import {
  ADMIN_SESSION_SECONDS,
  adminCookieName,
  createAdminToken,
  passwordMatches,
} from '../../../../lib/adminSession';

// Sikertelen belépések korlátja: címenként és összesen (elosztott találgatás ellen).
const WINDOW_SECONDS = 15 * 60;
const IP_LIMIT = 5;
const GLOBAL_LIMIT = 50;

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  };
}

// A korábbi (a jelszót magát tartalmazó) süti törlése a böngészőből.
function clearLegacyCookie(res) {
  res.cookies.set('admin_token', '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function POST(req) {
  if (!process.env.ADMIN_PASSWORD || !(process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET)) {
    return NextResponse.json(
      { ok: false, error: 'Az admin belépés nincs megfelelően beállítva a szerveren.' },
      { status: 500 }
    );
  }

  const ipKey = `rl:adminlogin:ip:${clientIp(req)}`;
  const globalKey = 'rl:adminlogin:global';
  const [ipFails, globalFails] = await Promise.all([kv.get(ipKey), kv.get(globalKey)]);
  if ((Number(ipFails) || 0) >= IP_LIMIT || (Number(globalFails) || 0) >= GLOBAL_LIMIT) {
    return NextResponse.json(
      { ok: false, error: 'Túl sok sikertelen próbálkozás. Próbáld újra később.' },
      { status: 429, headers: { 'Retry-After': String(WINDOW_SECONDS) } }
    );
  }

  // Plusz védelmi vonal: a jelszót csak admin jogú, bejelentkezett fióktól fogadjuk el.
  // Fiók nélkül a jelszót ki sem próbáljuk, így azt kívülről találgatni sem lehet.
  const account = await adminUser();
  if (!account) {
    return NextResponse.json(
      { ok: false, error: 'Az admin belépéshez admin jogú fiókkal kell bejelentkezve lenned.' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));

  if (passwordMatches(body?.password, process.env.ADMIN_PASSWORD)) {
    await kv.del(ipKey);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(adminCookieName(), createAdminToken(Date.now(), account.id), cookieOptions(ADMIN_SESSION_SECONDS));
    clearLegacyCookie(res);
    return res;
  }

  await Promise.all([kv.incr(ipKey, WINDOW_SECONDS), kv.incr(globalKey, WINDOW_SECONDS)]);
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), '', cookieOptions(0));
  clearLegacyCookie(res);
  return res;
}

// Az admin oldal ebből tudja, mit mutasson: bejelentkezés kell / nincs admin jog /
// jelszó kell / beléphet.
export async function GET(req) {
  const session = await auth();
  const account = session?.user ? await adminUser() : null;
  return NextResponse.json(
    { loggedIn: !!session?.user, admin: !!account, session: account ? await isAdminRequest(req) : false },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
