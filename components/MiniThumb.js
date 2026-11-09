'use client';
import { navModel } from '../lib/miniNav';

// Kis előnézet egy mini keresztrejtvényről (listákban): megfejtés előtt csak a fekete négyzetek és
// a sorszámok, megfejtés után a kitöltött betűk is (mint az admin piszkozatainál).
export default function MiniThumb({ rows, filled = false }) {
  const { nums } = navModel(rows);
  return (
    <div className="mini-thumb" aria-hidden="true">
      {rows.map((row, r) =>
        row.map((ch, c) =>
          ch === '#' ? (
            <span key={`${r}-${c}`} className="mini-thumb-sq black" />
          ) : (
            <span key={`${r}-${c}`} className="mini-thumb-sq">
              {nums[`${r},${c}`] && <span className="mini-thumb-num">{nums[`${r},${c}`]}</span>}
              {filled && <span className="mini-thumb-ch">{String(ch).toUpperCase()}</span>}
            </span>
          )
        )
      )}
    </div>
  );
}
