import { kv } from './kv';


// Napi statisztika Redis-számlálókkal (párhuzamos kéréseknél sem veszik el adat).
export async function recordResult(date, { hintsUsed, correct }) {
  const r = kv.raw();
  const key = `stats:h:${date}`;
  await r.hincrby(key, 'completions', 1);
  await r.hincrby(key, 'totalHints', hintsUsed);
  if (correct) await r.hincrby(key, 'correctCount', 1);
  // Lejárat nélkül: a korábbi titkosírásoknál a megfejtők száma 120 nap után is megmarad
  // (naponta egy kis hash). A korábban beállított lejáratot levesszük.
  await r.persist(key).catch(() => {});
}
