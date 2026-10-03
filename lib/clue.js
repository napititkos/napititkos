// A rejtvényszöveg szavakra bontása és a tippekhez kézzel kijelölt szavak kiemelése.
// A kiemelhető tipptípusok fix színt kapnak (minden rejtvénynél ugyanazt).
export const HL_TYPES = ['definicio', 'indikator', 'fodder'];
const WORD_RE = /[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű0-9]+/g;

// [{ t: szövegrész, w: szóindex (vagy -1, ha írásjel/szóköz) }]
export function clueTokens(clue) {
  const s = clue || '';
  const out = [];
  const re = new RegExp(WORD_RE.source, 'g');
  let last = 0;
  let wi = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index), w: -1 });
    out.push({ t: m[0], w: wi++ });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last), w: -1 });
  return out;
}

export const HL_LABELS = { definicio: 'Definíció', indikator: 'Mutató', fodder: 'Készlet' };

// szóindex -> a hozzá tartozó tipptípusok (fix sorrendben), a megadott (felfedett)
// típusok alapján. Egy szó több tipphez is tartozhat.
export function highlightMap(hints, types) {
  const map = new Map();
  for (const t of HL_TYPES) {
    if (!types.includes(t) || !hints?.[t]?.enabled) continue;
    for (const i of hints[t].words || []) {
      if (!map.has(i)) map.set(i, []);
      if (!map.get(i).includes(t)) map.get(i).push(t);
    }
  }
  return map;
}
