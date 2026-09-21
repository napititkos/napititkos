import { kv } from './kv';

const STATS_TTL_SECONDS = 120 * 24 * 3600;

// Napi statisztika Redis-számlálókkal (párhuzamos kéréseknél sem veszik el adat).
export async function recordResult(date, { hintsUsed, correct }) {
  const r = kv.raw();
  const key = `stats:h:${date}`;
  await r.hincrby(key, 'completions', 1);
  await r.hincrby(key, 'totalHints', hintsUsed);
  if (correct) await r.hincrby(key, 'correctCount', 1);
  await r.expire(key, STATS_TTL_SECONDS);
}
