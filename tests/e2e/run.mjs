// Végponttól végpontig futó teszt: hamis Redis + a valódi (build-elt) Next szerver + levél-kamu.
// Előfeltétel: `npm run build`. Futtatás: `npm run test:e2e`.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = path.resolve(here, '..', '..');
const PORT = 3100;
const mailLog = path.join(os.tmpdir(), `titkositas-mail-${process.pid}.log`);
fs.writeFileSync(mailLog, '');

if (!fs.existsSync(path.join(root, '.next'))) {
  console.error('Nincs .next mappa: előbb futtasd az `npm run build` parancsot.');
  process.exit(2);
}

const children = [];
function start(args, env = {}, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.getOutput = () => out;
  children.push(child);
  return child;
}
function stopAll() {
  for (const c of children) if (!c.killed) c.kill();
}

async function waitFor(url, ms = 60000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function runScript(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--no-warnings', path.join(here, file)], {
      cwd: root,
      env: { ...process.env, MAIL_LOG: mailLog },
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

let exitCode = 1;
try {
  start([path.join(here, 'fakeredis.mjs')]);
  await new Promise((r) => setTimeout(r, 500));
  const next = start(
    [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(PORT)],
    {
      MAIL_LOG: mailLog,
      NODE_OPTIONS: `--import ${pathToFileURL(path.join(here, 'resendshim.mjs')).href}`,
      REDIS_URL: 'redis://127.0.0.1:6390',
      AUTH_SECRET: 'helyi-teszt-titok',
      ADMIN_PASSWORD: 'Helyi-Admin-Jelszo-1',
      RESEND_API_KEY: 'dummy',
      SITE_URL: `http://localhost:${PORT}`,
      NEXT_TELEMETRY_DISABLED: '1',
    }
  );
  if (!(await waitFor(`http://localhost:${PORT}/`))) {
    console.error('A szerver nem indult el:\n' + next.getOutput());
    process.exit(1);
  }
  const a = await runScript('smoke.mjs');
  const b = await runScript('smoke2.mjs');
  exitCode = a === 0 && b === 0 ? 0 : 1;
} finally {
  stopAll();
  fs.rmSync(mailLog, { force: true });
}
process.exit(exitCode);
