import { clueTokens, HL_LABELS } from '../lib/clue';

// A rejtvényszöveg a felfedett tippekhez tartozó szavak színes kiemelésével. Ha egy szó
// több tipphez is tartozik, sávosan mindegyik tipp színe látszik.
const STRIPE = 6; // px, egy csík szélessége
function multiStyle(types) {
  const stops = types.map((t, i) => `var(--hl-${t}-bg) ${i * STRIPE}px ${(i + 1) * STRIPE}px`).join(', ');
  return { background: `repeating-linear-gradient(135deg, ${stops})` };
}

export default function ClueText({ clue, marks }) {
  if (!marks || marks.size === 0) return clue;
  return clueTokens(clue).map((tok, i) => {
    const types = tok.w >= 0 ? marks.get(tok.w) : null;
    if (!types || !types.length) return <span key={i}>{tok.t}</span>;
    const title = types.map((t) => HL_LABELS[t]).join(' + ');
    if (types.length === 1) {
      return (
        <mark className={`hl hl-${types[0]}`} key={i} title={title}>
          {tok.t}
        </mark>
      );
    }
    return (
      <mark className="hl hl-multi" key={i} title={title} style={multiStyle(types)}>
        {tok.t}
      </mark>
    );
  });
}
