// Előtöltött kamu: a Resend hívásokat naplózza fájlba, és sikert (vagy hibát) ad vissza.
import fs from 'node:fs';

const orig = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (url && url.startsWith('https://api.resend.com/emails')) {
    const body = JSON.parse(init.body);
    fs.appendFileSync(process.env.MAIL_LOG, JSON.stringify(body) + '\n');
    if (body.to.some((t) => t.startsWith('fail'))) {
      return new Response('secret-provider-detail: domain not verified', { status: 500 });
    }
    return new Response(JSON.stringify({ id: 'fake' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return orig(input, init);
};
