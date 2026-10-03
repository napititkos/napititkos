import { clueTokens } from '../lib/clue';

// A rejtvényszöveg a felfedett tippekhez tartozó szavak színes kiemelésével.
export default function ClueText({ clue, marks }) {
  if (!marks || marks.size === 0) return clue;
  return clueTokens(clue).map((tok, i) =>
    tok.w >= 0 && marks.has(tok.w) ? (
      <mark className={`hl hl-${marks.get(tok.w)}`} key={i}>
        {tok.t}
      </mark>
    ) : (
      <span key={i}>{tok.t}</span>
    )
  );
}
