'use client';
import { EMOJI_IMAGES } from '../lib/emojis';

// Egy emoji megjelenítése: a túl új emojik (pl. 🫪) képként, a többi szövegként.
export default function EmojiGlyph({ e }) {
  const src = EMOJI_IMAGES[e];
  if (src) return <img className="emoji-img" src={src} alt="" aria-hidden="true" draggable={false} />;
  return <span aria-hidden="true">{e}</span>;
}
