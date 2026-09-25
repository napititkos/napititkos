export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { readJson } from '../../../../lib/validate';

const KEY = 'notifications:list';
const MAX_TEXT = 1000;
const MAX_ITEMS = 50;
const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });

function cleanText(v) {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '')
    .trim()
    .slice(0, MAX_TEXT);
}

export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  return Response.json({ notifications: (await kv.get(KEY)) || [] });
}

export async function POST(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = await readJson(req, 5000);
  const text = cleanText(body?.text);
  if (!text) return Response.json({ error: 'empty' }, { status: 400 });
  const item = { id: crypto.randomBytes(8).toString('hex'), text, ts: Date.now() };
  const res = await kv.withLock('notifications', async () => {
    const list = (await kv.get(KEY)) || [];
    const next = [item, ...list].slice(0, MAX_ITEMS);
    await kv.set(KEY, next);
    return next;
  });
  if (!res) return Response.json({ error: 'busy' }, { status: 503 });
  return Response.json({ ok: true, notifications: res.value });
}

export async function DELETE(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'invalid' }, { status: 400 });
  const res = await kv.withLock('notifications', async () => {
    const next = ((await kv.get(KEY)) || []).filter((n) => n.id !== id);
    await kv.set(KEY, next);
    return next;
  });
  if (!res) return Response.json({ error: 'busy' }, { status: 503 });
  return Response.json({ ok: true, notifications: res.value });
}
