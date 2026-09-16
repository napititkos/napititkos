export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { password } = body;

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: 'Az ADMIN_PASSWORD nincs beállítva a szerveren.' },
      { status: 500 }
    );
  }

  if (password && password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('admin_token', password, {
      httpOnly: true,
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
    });
    return res;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
  return res;
}
