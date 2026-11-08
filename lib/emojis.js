// A reakciókhoz használt emojik (napi és közösségi titkosírások), kliens- és szerveroldalon is.
//
// A reakciók korábban egy rögzített 11-es lista (EMOJIS) sorszámaként tárolódtak ("0".."10"); ma
// magát az emoji karaktert tároljuk. A régi sorszámos értékeket olvasáskor alakítjuk át
// (normalizeReaction), így a meglévő reakciók változatlanul megmaradnak (a 😤-ra adottak is).
export const EMOJIS = ['😍', '🤯', '😂', '🧠', '🔥', '👏', '🤔', '🫪', '😤', '🐏', '🪦'];

// A reakciósor alap-emojijai, a megjelenítés sorrendjében (előbb az arcos emojik). A sor végén
// a + gomb a teljes készletet hozza elő.
export const PRESET_EMOJIS = ['😍', '🤯', '😂', '🤔', '🫪', '🧠', '🔥', '👏', '🐏', '🪦'];

// Azok az emojik, amelyek túl újak ahhoz, hogy minden eszköz ki tudja rajzolni (a 🫪 és a nagyon
// népszerű, Emoji 13.0-nál újabbak): ezeket képként jelenítjük meg (Twemoji, CC-BY 4.0; a lábléc
// tartalmazza a forrásmegjelölést).
export const EMOJI_IMAGES = {
  "🫪": "/emoji/1faea.svg",
  "🥹": "/emoji/1f979.svg",
  "🫶": "/emoji/1faf6.svg",
  "🫡": "/emoji/1fae1.svg",
  "❤️‍🩹": "/emoji/2764-fe0f-200d-1fa79.svg",
  "🩷": "/emoji/1fa77.svg",
  "🫠": "/emoji/1fae0.svg",
  "🫦": "/emoji/1fae6.svg",
  "🫩": "/emoji/1fae9.svg",
  "❤️‍🔥": "/emoji/2764-fe0f-200d-1f525.svg",
  "🫵": "/emoji/1faf5.svg",
  "🫣": "/emoji/1fae3.svg",
  "🩵": "/emoji/1fa75.svg",
  "😮‍💨": "/emoji/1f62e-200d-1f4a8.svg",
  "🙂‍↕️": "/emoji/1f642-200d-2195-fe0f.svg",
  "🫧": "/emoji/1fae7.svg",
  "🪩": "/emoji/1faa9.svg",
  "🪽": "/emoji/1fabd.svg",
  "😵‍💫": "/emoji/1f635-200d-1f4ab.svg",
  "🫰": "/emoji/1faf0.svg",
  "🪷": "/emoji/1fab7.svg",
  "🙂‍↔️": "/emoji/1f642-200d-2194-fe0f.svg",
  "🩶": "/emoji/1fa76.svg",
  "🫨": "/emoji/1fae8.svg",
  "🪫": "/emoji/1faab.svg",
  "🫢": "/emoji/1fae2.svg",
  "😶‍🌫️": "/emoji/1f636-200d-1f32b-fe0f.svg",
  "🪬": "/emoji/1faac.svg",
  "🐦‍🔥": "/emoji/1f426-200d-1f525.svg",
  "🫃": "/emoji/1fac3.svg",
  "🐦‍⬛": "/emoji/1f426-200d-2b1b.svg",
  "🪻": "/emoji/1fabb.svg",
  "🪼": "/emoji/1fabc.svg"
};

// Tárolt érték -> emoji (a régi sorszámos értékeket is kezeli); érvénytelen érték: null.
export function normalizeReaction(v) {
  if (v == null) return null;
  const s = String(v);
  if (/^\d+$/.test(s)) return EMOJIS[Number(s)] || null;
  return s || null;
}

// Egy reakció-hash (azonosító -> tárolt érték) összesítése: { emoji: darab }, és a saját reakció.
export function tallyReactions(all, actor) {
  const counts = {};
  for (const v of Object.values(all || {})) {
    const e = normalizeReaction(v);
    if (e) counts[e] = (counts[e] || 0) + 1;
  }
  const mine = actor && all ? normalizeReaction(all[actor]) : null;
  return { counts, mine };
}

// A megjelenítendő sorrend: előbb az alap-emojik, utána a többi (a teljes készletből választottak)
// darabszám szerint csökkenőben.
export function orderedEmojis(counts) {
  const extra = Object.keys(counts || {})
    .filter((e) => !PRESET_EMOJIS.includes(e) && counts[e] > 0)
    .sort((a, b) => counts[b] - counts[a]);
  return [...PRESET_EMOJIS, ...extra];
}

export function totalReactions(counts) {
  return Object.values(counts || {}).reduce((a, b) => a + b, 0);
}
