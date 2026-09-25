// Memóriabeli, minimális Redis (RESP) szerver a helyi teszthez: string, hash, sorted set.
import net from 'node:net';

const store = new Map(); // key -> { type, v, exp }
const now = () => Date.now();

function alive(k) {
  const e = store.get(k);
  if (!e) return null;
  if (e.exp !== null && e.exp <= now()) { store.delete(k); return null; }
  return e;
}
function get(k, type, create = false) {
  let e = alive(k);
  if (!e && create) { e = { type, v: type === 'hash' || type === 'zset' ? new Map() : type === 'list' ? [] : '', exp: null }; store.set(k, e); }
  return e;
}

const bulk = (s) => (s == null ? '$-1\r\n' : `$${Buffer.byteLength(String(s))}\r\n${s}\r\n`);
const int = (n) => `:${n}\r\n`;
const arr = (items) => `*${items.length}\r\n${items.map(bulk).join('')}`;
const ok = '+OK\r\n';
const glob = (p) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');

function run(a) {
  const cmd = a[0].toUpperCase();
  switch (cmd) {
    case 'PING': return '+PONG\r\n';
    case 'QUIT': case 'SELECT': case 'CLIENT': case 'AUTH': case 'HELLO': return ok;
    case 'INFO': return bulk('# Server\r\nredis_version:7.2.0\r\nloading:0\r\n');
    case 'GET': { const e = get(a[1]); return bulk(e && e.type === 'string' ? e.v : null); }
    case 'MGET': return arr(a.slice(1).map((k) => { const e = get(k); return e && e.type === 'string' ? e.v : null; }));
    case 'SET': {
      const [, k, v, ...opt] = a;
      let exp = null; let nx = false;
      for (let i = 0; i < opt.length; i++) {
        const o = opt[i].toUpperCase();
        if (o === 'EX') exp = now() + Number(opt[++i]) * 1000;
        else if (o === 'PX') exp = now() + Number(opt[++i]);
        else if (o === 'NX') nx = true;
      }
      if (nx && alive(k)) return '$-1\r\n';
      store.set(k, { type: 'string', v, exp });
      return ok;
    }
    case 'DEL': { let n = 0; for (const k of a.slice(1)) if (alive(k)) { store.delete(k); n++; } return int(n); }
    case 'INCR': { const e = get(a[1], 'string', true); const n = (Number(e.v) || 0) + 1; e.v = String(n); return int(n); }
    case 'TTL': { const e = alive(a[1]); if (!e) return int(-2); if (e.exp === null) return int(-1); return int(Math.ceil((e.exp - now()) / 1000)); }
    case 'EXPIRE': { const e = alive(a[1]); if (!e) return int(0); e.exp = now() + Number(a[2]) * 1000; return int(1); }
    case 'KEYS': { const re = glob(a[1]); return arr([...store.keys()].filter((k) => alive(k) && re.test(k))); }
    case 'SCAN': {
      let pattern = '*';
      for (let i = 2; i < a.length; i++) if (a[i].toUpperCase() === 'MATCH') pattern = a[i + 1];
      const re = glob(pattern);
      const ks = [...store.keys()].filter((k) => alive(k) && re.test(k));
      return `*2\r\n${bulk('0')}${arr(ks)}`;
    }
    // hash
    case 'HSET': { const e = get(a[1], 'hash', true); let n = 0; for (let i = 2; i < a.length; i += 2) { if (!e.v.has(a[i])) n++; e.v.set(a[i], String(a[i + 1])); } return int(n); }
    case 'HSETNX': { const e = get(a[1], 'hash', true); if (e.v.has(a[2])) return int(0); e.v.set(a[2], String(a[3])); return int(1); }
    case 'HGET': { const e = get(a[1], 'hash'); return bulk(e && e.v.has(a[2]) ? e.v.get(a[2]) : null); }
    case 'HMGET': { const e = get(a[1], 'hash'); return arr(a.slice(2).map((f) => (e && e.v.has(f) ? e.v.get(f) : null))); }
    case 'HGETALL': { const e = get(a[1], 'hash'); const out = []; if (e) for (const [f, v] of e.v) out.push(f, v); return arr(out); }
    case 'HINCRBY': { const e = get(a[1], 'hash', true); const n = (Number(e.v.get(a[2])) || 0) + Number(a[3]); e.v.set(a[2], String(n)); return int(n); }
    case 'HDEL': { const e = get(a[1], 'hash'); let n = 0; if (e) for (const f of a.slice(2)) if (e.v.delete(f)) n++; return int(n); }
    // sorted set
    case 'ZADD': {
      let i = 2; let nx = false;
      while (['NX', 'XX', 'GT', 'LT', 'CH'].includes(a[i].toUpperCase())) { if (a[i].toUpperCase() === 'NX') nx = true; i++; }
      const e = get(a[1], 'zset', true); let n = 0;
      for (; i < a.length; i += 2) { if (e.v.has(a[i + 1])) { if (!nx) e.v.set(a[i + 1], Number(a[i])); } else { e.v.set(a[i + 1], Number(a[i])); n++; } }
      return int(n);
    }
    case 'ZRANGE': {
      const e = get(a[1], 'zset'); if (!e) return arr([]);
      const sorted = [...e.v.entries()].sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
      const start = Number(a[2]); let stop = Number(a[3]); if (stop < 0) stop = sorted.length + stop;
      const slice = sorted.slice(start, stop + 1);
      const withScores = a.slice(4).some((x) => x.toUpperCase() === 'WITHSCORES');
      return arr(slice.flatMap(([m, s]) => (withScores ? [m, String(s)] : [m])));
    }
    case 'ZREM': { const e = get(a[1], 'zset'); let n = 0; if (e) for (const m of a.slice(2)) if (e.v.delete(m)) n++; return int(n); }
    // Lista-parancsok (a kommentek használják).
    case 'RPUSH': { const e = get(a[1], 'list', true); e.v.push(...a.slice(2)); return int(e.v.length); }
    case 'LLEN': { const e = get(a[1], 'list'); return int(e ? e.v.length : 0); }
    case 'LRANGE': {
      const e = get(a[1], 'list'); if (!e) return arr([]);
      const len = e.v.length; let s0 = Number(a[2]); let s1 = Number(a[3]);
      if (s0 < 0) s0 = Math.max(0, len + s0); if (s1 < 0) s1 = len + s1;
      return arr(e.v.slice(s0, s1 + 1));
    }
    case 'LREM': {
      const e = get(a[1], 'list'); if (!e) return int(0);
      let cnt = Number(a[2]); const val = a[3]; let n = 0;
      if (cnt >= 0) { for (let i = 0; i < e.v.length && (cnt === 0 || n < cnt); ) { if (e.v[i] === val) { e.v.splice(i, 1); n++; } else i++; } }
      else { for (let i = e.v.length - 1; i >= 0 && n < -cnt; i--) if (e.v[i] === val) { e.v.splice(i, 1); n++; } }
      return int(n);
    }
    case 'ZCARD': { const e = get(a[1], 'zset'); return int(e ? e.v.size : 0); }
    default: return `-ERR unknown command '${cmd}'\r\n`;
  }
}

net.createServer((sock) => {
  let buf = Buffer.alloc(0);
  sock.on('data', (d) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      if (buf[0] !== 0x2a) { buf = Buffer.alloc(0); return; }
      const pos = buf.indexOf('\r\n'); if (pos < 0) return;
      const n = Number(buf.slice(1, pos).toString());
      let p = pos + 2; const args = [];
      for (let i = 0; i < n; i++) {
        const lp = buf.indexOf('\r\n', p); if (lp < 0) return;
        const len = Number(buf.slice(p + 1, lp).toString());
        const end = lp + 2 + len;
        if (buf.length < end + 2) return;
        args.push(buf.slice(lp + 2, end).toString());
        p = end + 2;
      }
      buf = buf.slice(p);
      sock.write(run(args));
    }
  });
  sock.on('error', () => {});
}).listen(6390, '127.0.0.1', () => console.log('fakeredis :6390'));
