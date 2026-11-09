import { kv } from './kv';
import { MINI_KEYS, loadBank, normWord } from './mini';
import { MINI_IMPORT_LABELS, MINI_IMPORT_SETS } from './miniImportData';

// Az automatikus készletek (országkódok, vegyjelek, mértékegységek stb.) egyszeri beemelése a
// kérdésbankba. Egy jelző (mini:import:v1) rögzíti, hogy lefutott; a bankban a kérdések forrása
// "auto:<készlet>", így később egyenként vagy készletenként szerkeszthetők, törölhetők.
// Ha egy szóhoz már pontosan ugyanez a kérdés megvan, nem kerül be még egyszer.
export const MINI_IMPORT_FLAG = 'mini:import:v1';

export function importLabel(src) {
  const k = String(src || '').replace(/^auto:/, '');
  return MINI_IMPORT_LABELS[k] || k;
}

export async function importMiniSetsOnce(now = new Date()) {
  if (await kv.get(MINI_IMPORT_FLAG)) return { skipped: true };
  const res = await kv.withLock(
    'mini-bank',
    async () => {
      if (await kv.get(MINI_IMPORT_FLAG)) return { skipped: true };
      const bank = await loadBank();
      let added = 0;
      const at = new Date(now).toISOString();
      for (const [set, list] of Object.entries(MINI_IMPORT_SETS)) {
        list.forEach(([w, clue], i) => {
          const word = normWord(w);
          if (!word) return;
          const variants = (bank[word] = bank[word] || []);
          if (variants.some((v) => v.clue === clue)) return;
          variants.push({ id: `auto-${set}-${i}`, clue, at, src: `auto:${set}` });
          added++;
        });
      }
      await kv.set(MINI_KEYS.bank, bank);
      await kv.set(MINI_IMPORT_FLAG, { at, added });
      return { added };
    },
    { ttlMs: 20000, waitMs: 5000 }
  );
  return res ? res.value : { busy: true };
}
