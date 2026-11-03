'use client';
import { useEffect, useState } from 'react';
import { EMOJI_IMAGES, EMOJI_ORDER } from '../lib/emojis';

// Egységes emoji-reakció sor (napi titkosírások, korábbi titkosírások, közösségi titkosírások).
// - A keretes gombban csak az emoji van, a darabszám alatta, a kereten kívül; a 0 nem látszik.
// - Amíg nincs saját reakció (vagy a sajátra koppintva újraválasztanál), a teljes sor látszik;
//   utána csak azok, amelyekre már valaki reagált, a saját kiemelve.
// - Az első megjelenéskor és újraválasztáskor ugyanaz a felbukkanó animáció.
// - A szülő azonnal (optimistán) frissíti a számokat: az onReact szinkron hívódik, a mentés a
//   háttérben fut.
// - Az emoji nem jelölhető ki, nem másolható; a túl új emojik képként jelennek meg.
export function EmojiGlyph({ e }) {
  const src = EMOJI_IMAGES[e];
  if (src) return <img className="emoji-img" src={src} alt="" aria-hidden="true" draggable={false} />;
  return <span aria-hidden="true">{e}</span>;
}

// A megjelenítési sorrend: [emoji, tárolt sorszám] párok (az arcos emojik elöl).
function order(emojis) {
  const idx = EMOJI_ORDER.length === emojis.length ? EMOJI_ORDER : emojis.map((_, k) => k);
  return idx.map((k) => [emojis[k], k]);
}

export default function ReactionBar({ emojis, reactions, mine, interactive = true, disabled = false, onReact }) {
  const [pickOpen, setPickOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const showPicker = interactive && (mine == null || pickOpen);

  useEffect(() => {
    if (!(interactive && mine == null)) return;
    setIntro(true);
    const t = setTimeout(() => setIntro(false), 900);
    return () => clearTimeout(t);
    // Csak a sor első megjelenésekor (vagy amikor reagálhatóvá válik) fusson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  const count = (k) => (
    <span className={`reaction-count${reactions[k] ? '' : ' zero'}`} aria-hidden="true">
      {reactions[k]}
    </span>
  );
  const badge = (e, k) => (
    <span key={k} className="reaction-item">
      <span className="reaction-btn reaction-static" aria-label={`${e} reakció, ${reactions[k]} darab`} role="img">
        <EmojiGlyph e={e} />
      </span>
      {count(k)}
    </span>
  );

  if (showPicker) {
    return (
      <div className={`reaction-row reaction-stacked${pickOpen || intro ? ' reaction-row-open' : ''}`} role="group" aria-label="Reakció választása">
        {order(emojis).map(([e, k], i) => (
          <span key={k} className="reaction-item" style={{ '--i': i }}>
            <button
              type="button"
              className={`reaction-btn${mine === k ? ' on' : ''}`}
              aria-label={`${e} reakció, ${reactions[k]} darab`}
              aria-pressed={mine === k}
              disabled={disabled}
              onClick={() => {
                if (mine !== k) onReact(k);
                setPickOpen(false);
                setIntro(false);
              }}
            >
              <EmojiGlyph e={e} />
            </button>
            {count(k)}
          </span>
        ))}
      </div>
    );
  }

  if (!reactions.some((n) => n > 0)) return null;
  return (
    <div className="reaction-row reaction-stacked" role="group" aria-label="Reakciók">
      {order(emojis).map(([e, k], i) =>
        reactions[k] > 0 ? (
          interactive && mine === k ? (
            <span key={k} className="reaction-item">
              <button
                type="button"
                className="reaction-btn on mine"
                aria-label={`A te reakciód: ${e}, összesen ${reactions[k]}. Koppints a módosításhoz.`}
                title="A te reakciód - kattints a módosításhoz"
                onClick={() => setPickOpen(true)}
              >
                <EmojiGlyph e={e} />
              </button>
              {count(k)}
            </span>
          ) : (
            badge(e, k)
          )
        ) : null
      )}
    </div>
  );
}

// Optimista darabszám-frissítés: a régi saját reakció -1, az új +1.
export function applyReaction(reactions, prevMine, next) {
  const out = [...reactions];
  if (prevMine != null) out[prevMine] = Math.max(0, out[prevMine] - 1);
  if (next != null) out[next] += 1;
  return out;
}
