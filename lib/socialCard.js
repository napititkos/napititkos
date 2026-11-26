import { ImageResponse } from 'next/og';
import { FREDOKA_BASE64 } from '../app/fredoka-font-data';
import { NUNITO_700_BASE64 } from '../app/nunito-font-data';
import { LOGO_PNG_BASE64 } from '../app/logo-og-data';
import { LOGO_XMAS_PNG_BASE64 } from '../app/logo-xmas-og-data';
import { enumerationFor, huDate } from './format';
import { tileRows } from './socialLayout';

// A napi titkosírás képe a közösségi posztokhoz (Facebook: széles, Instagram: álló 4:5), a honlap
// világos vagy sötét módjának színeivel (naponta váltakozva, lásd themeForDay). A képen csak a rejtvény szövege, a betűk száma és az üres betűdobozok
// szerepelnek: a megfejtés soha nem kerülhet rá.
const THEMES = {
  dark: { paper: '#16121E', card: '#231D2F', line: '#3A3148', tile: '#4A3F5C', ink: '#F0F0FC', soft: '#BDB4CF', accent: '#D9BCD3', iras: '#A98CBA' },
  light: { paper: '#F0F0FC', card: '#FFFFFF', line: '#DCD3E8', tile: '#C9BDD9', ink: '#1F1A2B', soft: '#5A5270', accent: '#8A3D74', iras: '#A98CBA' },
};

// Karácsonyi színek (december 1–25.): a lila helyett pirosas, a rózsaszín helyett zöldes.
const THEMES_XMAS = {
  dark: { paper: '#131A16', card: '#1B2520', line: '#2E4A38', tile: '#3E5E4A', ink: '#F0F4F0', soft: '#B9CDBF', accent: '#F3A3AB', iras: '#E58C95' },
  light: { paper: '#F3F6F2', card: '#FFFFFF', line: '#CFE2D3', tile: '#B9D6C0', ink: '#1F1A2B', soft: '#4D5E52', accent: '#9E2A37', iras: '#C24A57' },
};
const pal = (theme, xmas) => (xmas ? THEMES_XMAS : THEMES)[theme] || (xmas ? THEMES_XMAS : THEMES).dark;

// Hópelyhek a háttérben (karácsonykor), halványan, a kép szélein elszórva.
function Snow({ w, h, C }) {
  const flakes = [];
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 34; i++) {
    const x = Math.round(rnd() * w), y = Math.round(rnd() * h), z = 14 + Math.round(rnd() * 14);
    flakes.push(
      <svg key={i} width={z} height={z} viewBox="0 0 24 24" style={{ position: 'absolute', left: x, top: y, opacity: 0.35 }}>
        <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5" fill="none" stroke={C.soft} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: w, height: h }}>{flakes}</div>;
}

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

function Wordmark({ size, C, xmas = false }) {
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
        {xmas ? (
          <img src={`data:image/png;base64,${LOGO_XMAS_PNG_BASE64}`} width={logo} height={Math.round(logo * 1.104)} style={{ position: 'absolute', left: (ring - logo) / 2, top: (ring - logo) / 2 - Math.round(logo * 0.104) }} />
        ) : (
          <img src={`data:image/png;base64,${LOGO_PNG_BASE64}`} width={logo} height={logo} style={{ position: 'absolute', left: (ring - logo) / 2, top: (ring - logo) / 2 }} />
        )}
      </div>
      <div style={{ ...letters, color: C.ink }}>S</div>
      <div style={{ ...letters, color: C.iras }}>ÍRÁS</div>
    </div>
  );
}

// entry: a rotation:history egy eleme (clue, answer, shownDate); dayNumber: hányadik titkosírás.
export function renderSocialCard({ entry, format, dayNumber, theme, xmas = false }) {
  const f = CARD_FORMATS[format] || CARD_FORMATS.fb;
  const C = pal(theme, xmas);
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
          position: 'relative',
          padding: f.pad,
          gap: f.gap,
        }}
      >
        {xmas && <Snow w={f.width} h={f.height} C={C} />}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(f.gap * 0.5) }}>
          <Wordmark size={f.mark} C={C} xmas={xmas} />
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
  ['S', 'O', 'K', '#'],
  ['O', 'K', 'O', 'S'],
  ['K', 'O', 'S', '#'],
  ['#', 'S', '#', '#'],
];
const MINI_COLORS = {
  light: { sq: '#F4E7F1', black: '#664C7C', border: '#D9C3D6', ink: '#1F1A2B' },
  dark: { sq: '#3A2A39', black: '#2A1D3B', border: '#554058', ink: '#F0F0FC' },
};
const MINI_XMAS = {
  light: { sq: '#E6F2E8', black: '#8E2433', border: '#B9D6C0', ink: '#1F1A2B' },
  dark: { sq: '#20382A', black: '#4A1820', border: '#355742', ink: '#F0F4F0' },
};

export function renderMiniCard({ format, theme, xmas = false }) {
  const f = CARD_FORMATS[format] || CARD_FORMATS.fb;
  const C = pal(theme, xmas);
  const M = (xmas ? MINI_XMAS : MINI_COLORS)[theme] || MINI_COLORS.dark;
  const cell = format === 'ig' ? 150 : 82;
  const title = format === 'ig' ? 64 : 46;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, padding: f.pad, gap: format === 'ig' ? 56 : 22, position: 'relative' }}>
        {xmas && <Snow w={f.width} h={f.height} C={C} />}
        <Wordmark size={format === 'ig' ? 80 : 46} C={C} xmas={xmas} />
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

// A szókereső + szólánc poszt képe (csak Facebook, 1200×630): bal oldalt a nap 3×3-as szókereső
// rácsa, jobb oldalt felül a Szólánc kezdőszava, középen egy üres sor, alul a célszó.
// Két színű felirat (a beágyazott Fredokában már az Ő is megvan).
function TwoTone({ a, b, size, C }) {
  const st = { display: 'flex', fontSize: size, fontFamily: 'Fredoka', fontWeight: 700, letterSpacing: Math.round(0.03 * size), lineHeight: 1 };
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ ...st, color: C.ink }}>{a}</div>
      <div style={{ ...st, color: C.iras }}>{b}</div>
    </div>
  );
}
export function renderComboCard({ theme, grid, start, end, date, words = 0, xmas = false }) {
  const C = pal(theme, xmas);
  const M = (xmas ? MINI_XMAS : MINI_COLORS)[theme] || MINI_COLORS.dark;
  const cell = 94;
  const n = [...String(start)].length;
  const tile = n >= 5 ? 58 : n === 4 ? 64 : 70;
  const word = (w, kind) => (
    <div style={{ display: 'flex', gap: 10 }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: tile, height: tile, borderRadius: Math.round(tile * 0.2),
            border: `${kind === 'empty' ? 3 : 2}px ${kind === 'end' ? 'dashed' : 'solid'} ${kind === 'empty' ? C.iras : C.tile}`,
            backgroundColor: kind === 'start' ? M.sq : C.card, fontFamily: 'Fredoka', fontWeight: 700, fontSize: Math.round(tile * 0.5), color: kind === 'end' ? C.accent : C.ink,
          }}
        >
          {w ? [...w][i].toUpperCase() : ''}
        </div>
      ))}
    </div>
  );
  const label = (t) => <div style={{ display: 'flex', fontFamily: 'Nunito', fontSize: 18, letterSpacing: 3, color: C.soft }}>{t}</div>;
  const hint = (t) => <div style={{ display: 'flex', fontFamily: 'Nunito', fontSize: 19, color: C.ink, textAlign: 'center', lineHeight: 1.25, maxWidth: 460 }}>{t}</div>;
  const panel = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.card, border: `2px solid ${C.line}`, borderRadius: 28, padding: '18px 26px', width: 520, height: 470 };
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, padding: 24, gap: 12, position: 'relative' }}>
        {xmas && <Snow w={1200} h={630} C={C} />}
        <div style={{ display: 'flex', fontFamily: 'Nunito', fontSize: 24, color: C.soft }}>{`Mai szójátékok · ${huDate(date)}`}</div>
        <div style={{ display: 'flex', gap: 36 }}>
          <div style={panel}>
            <TwoTone a="SZÓ" b="KERESŐ" size={42} C={C} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((r) => (
                <div key={r} style={{ display: 'flex', gap: 10 }}>
                  {[0, 1, 2].map((c) => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: cell, height: cell, borderRadius: 20, backgroundColor: M.sq, border: `2px solid ${M.border}`, fontFamily: 'Fredoka', fontWeight: 700, fontSize: 52, color: M.ink }}>
                      {String(grid[r * 3 + c] || '').toUpperCase()}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {words > 0 && hint(`${words} szót kell megkeresni`)}
          </div>
          <div style={panel}>
            <TwoTone a="SZÓ" b="LÁNC" size={42} C={C} />
            {label('KEZDŐ SZÓ')}
            {word(start, 'start')}
            {word('', 'empty')}
            {word(end, 'end')}
            {label('CÉL SZÓ')}
            {hint('A kezdő szóból juss el a célszóig úgy, hogy csak egy betűt változtatsz lépésenként!')}
          </div>
        </div>
        <div style={{ display: 'flex', fontFamily: 'Fredoka', fontWeight: 700, fontSize: 30, color: C.accent }}>Fejtsd meg: napititkos.hu</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Fredoka', data: Buffer.from(FREDOKA_BASE64, 'base64'), style: 'normal', weight: 700 },
        { name: 'Nunito', data: Buffer.from(NUNITO_700_BASE64, 'base64'), style: 'normal', weight: 700 },
      ],
    }
  );
}
