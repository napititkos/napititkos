export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { password } = body;

  if (!process.env.ADMIN_PASSWORD) {
    return Response.json(
      { ok: false, error: 'Az ADMIN_PASSWORD nincs beállítva a szerveren.' },
      { status: 500 }
    );
  }

  if (password && password === process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Set-Cookie': `admin_token=${encodeURIComponent(password)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
        'Content-Type': 'application/json',
      },
    });
  }
  return Response.json({ ok: false }, { status: 401 });
}

export async function DELETE() {
  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': 'admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
    },
  });
}
