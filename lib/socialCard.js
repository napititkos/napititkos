import { ImageResponse } from 'next/og';
import { FREDOKA_BASE64 } from '../app/fredoka-font-data';
import { NUNITO_700_BASE64 } from '../app/nunito-font-data';
import { LOGO_PNG_BASE64 } from '../app/logo-og-data';
import { enumerationFor, huDate } from './format';
import { tileRows } from './socialLayout';

// A napi titkosírás képe a közösségi posztokhoz (Facebook: széles, Instagram: álló 4:5), a honlap
// világos vagy sötét módjának színeivel (naponta váltakozva, lásd themeForDay). A képen csak a rejtvény szövege, a betűk száma és az üres betűdobozok
// szerepelnek: a megfejtés soha nem kerülhet rá.
const THEMES = {
  dark: { paper: '#16121E', card: '#231D2F', line: '#3A3148', tile: '#4A3F5C', ink: '#F0F0FC', soft: '#BDB4CF', accent: '#D9BCD3', iras: '#A98CBA' },
  light: { paper: '#F0F0FC', card: '#FFFFFF', line: '#DCD3E8', tile: '#C9BDD9', ink: '#1F1A2B', soft: '#5A5270', accent: '#8A3D74', iras: '#A98CBA' },
};

export { themeForDay } from './socialTheme';

export const CARD_FORMATS = {
  fb: { width: 1200, height: 630, pad: 44, mark: 56, date: 26, clue: [44, 38, 32, 27], tileMax: 64, tilesH: 150, foot: 32, gap: 22 },
  ig: { width: 1080, height: 1350, pad: 72, mark: 96, date: 40, clue: [66, 58, 48, 40], tileMax: 110, tilesH: 400, foot: 50, gap: 64 },
};

// A szöveg hosszához igazított betűméret (a képen nincs automatikus illesztés).
function clueSize(text, sizes) {
  const n = (text || '').length;
  if (n <= 60) return sizes[0];
  if (n <= 100) return sizes[1];
  if (n <= 150) return sizes[2];
  return sizes[3];
}

function Wordmark({ size, C }) {
  const F = size;
  const ring = Math.round(1.14 * F);
  const border = Math.round(0.12 * F);
  const logo = Math.round((ring - 2 * border) * 1.407);
  const letters = { display: 'flex', fontSize: F, fontFamily: 'Fredoka', fontWeight: 700, letterSpacing: Math.round(0.03 * F), lineHeight: 1 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...letters, color: C.ink }}>TITK</div>
      <div style={{ display: 'flex', position: 'relative', width: ring, height: ring, margin: `0 ${Math.round(0.03 * F)}px` }}>
        <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: ring, height: ring, border: `${border}px solid ${C.ink}`, borderRadius: ring }} />
        <img src={`data:image/png;base64,${LOGO_PNG_BASE64}`} width={logo} height={logo} style={{ position: 'absolute', left: (ring - logo) / 2, top: (ring - logo) / 2 }} />
      </div>
      <div style={{ ...letters, color: C.ink }}>S</div>
      <div style={{ ...letters, color: C.iras }}>ÍRÁS</div>
    </div>
  );
}

// entry: a rotation:history egy eleme (clue, answer, shownDate); dayNumber: hányadik titkosírás.
export function renderSocialCard({ entry, format, dayNumber, theme }) {
  const f = CARD_FORMATS[format] || CARD_FORMATS.fb;
  const C = THEMES[theme] || THEMES.dark;
  const clue = String(entry.clue || '').trim();
  const enumeration = enumerationFor(String(entry.answer || '').trim());
  const fs = clueSize(clue, f.clue);
  const inner = f.width - 2 * f.pad;
  const boxes = tileRows(entry.answer, inner - 2 * Math.round(f.pad * 0.6), f.tileMax, f.tilesH);
  const sub = [dayNumber ? `#${dayNumber}` : null, huDate(entry.shownDate)].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.paper,
          padding: f.pad,
          gap: f.gap,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(f.gap * 0.5) }}>
          <Wordmark size={f.mark} C={C} />
          <div style={{ display: 'flex', fontFamily: 'Nunito', fontSize: f.date, color: C.soft }}>{sub}</div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            backgroundColor: C.card,
            border: `2px solid ${C.line}`,
            borderRadius: Math.round(f.pad * 0.6),
            padding: `${Math.round(f.pad * 0.6)}px ${Math.round(f.pad * 0.6)}px`,
            gap: Math.round(f.gap * 0.9),
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', textAlign: 'center', fontFamily: 'Nunito', fontSize: fs, lineHeight: 1.35, color: C.ink }}>
            {`${clue} ${enumeration}`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: boxes.rowGap }}>
            {boxes.rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: boxes.wordGap }}>
                {row.map((n, wi) => (
                  <div key={wi} style={{ display: 'flex', gap: boxes.gap }}>
                    {Array.from({ length: n }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          width: boxes.tile,
                          height: boxes.tile,
                          border: `${Math.max(2, Math.round(boxes.tile * 0.06))}px solid ${C.tile}`,
                          borderRadius: Math.round(boxes.tile * 0.21),
                          backgroundColor: C.paper,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', fontFamily: 'Fredoka', fontWeight: 700, fontSize: f.foot, color: C.accent }}>
          Fejtsd meg: napititkos.hu
        </div>
      </div>
    ),
    {
      width: f.width,
      height: f.height,
      fonts: [
        { name: 'Fredoka', data: Buffer.from(FREDOKA_BASE64, 'base64'), style: 'normal', weight: 700 },
        { name: 'Nunito', data: Buffer.from(NUNITO_700_BASE64, 'base64'), style: 'normal', weight: 700 },
      ],
    }
  );
}

// A heti mini keresztrejtvény posztjának képe: egy kis, kitöltött 4x4-es rács csak KOS / OKOS /
// SOK szavakból (vízszintesen és függőlegesen is), fölötte a felirat. Mindig ugyanaz a rács.
export const MINI_TEASER = [
  ['K', 'O', 'S', '#'],
  ['O', 'K', 'O', 'S'],
  ['S', 'O', 'K', '#'],
  ['#', 'S', '#', '#'],
];
const MINI_COLORS = {
  light: { sq: '#F4E7F1', black: '#664C7C', border: '#D9C3D6', ink: '#1F1A2B' },
  dark: { sq: '#3A2A39', black: '#2A1D3B', border: '#554058', ink: '#F0F0FC' },
};

export function renderMiniCard({ format, theme }) {
  const f = CARD_FORMATS[format] || CARD_FORMATS.fb;
  const C = THEMES[theme] || THEMES.dark;
  const M = MINI_COLORS[theme] || MINI_COLORS.dark;
  const cell = format === 'ig' ? 150 : 82;
  const title = format === 'ig' ? 64 : 46;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, padding: f.pad, gap: format === 'ig' ? 56 : 22 }}>
        <Wordmark size={format === 'ig' ? 80 : 46} C={C} />
        <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontFamily: 'Nunito', fontWeight: 700, fontSize: title, lineHeight: 1.15, color: C.accent, maxWidth: '92%' }}>
          Új heti mini keresztrejtvény érhető el!
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', border: `${Math.round(cell / 18)}px solid ${M.black}`, borderRadius: 10 }}>
          {MINI_TEASER.map((row, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {row.map((ch, c) => (
                <div
                  key={c}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: cell, height: cell,
                    backgroundColor: ch === '#' ? M.black : M.sq, border: `1px solid ${M.border}`,
                    fontFamily: 'Nunito', fontSize: Math.round(cell * 0.55), color: M.ink,
                  }}
                >
                  {ch === '#' ? '' : ch}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: f.width,
      height: f.height,
      fonts: [
        { name: 'Fredoka', data: Buffer.from(FREDOKA_BASE64, 'base64'), style: 'normal', weight: 700 },
        { name: 'Nunito', data: Buffer.from(NUNITO_700_BASE64, 'base64'), style: 'normal', weight: 700 },
      ],
    }
  );
}
