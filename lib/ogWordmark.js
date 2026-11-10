import { ImageResponse } from 'next/og';
import { FREDOKA_BASE64 } from '../app/fredoka-font-data';
import { LOGO_PNG_BASE64 } from '../app/logo-og-data';
import { NUNITO_700_BASE64 } from '../app/nunito-font-data';

// Megosztási képek (OG) a fejlécek stílusában: a felirat (Fredoka, a kos gyűrűben az O helyén, a
// Heti Mininél a két szó között), alatta az alcím. Az Ő a betűtípusból hiányzik: az O fölé a
// betűtípus Ó betűjéből kivágott két ékezet kerül (mint az oldalon).
export const OG_SIZE = { width: 1200, height: 630 };
const INK = '#1F1A2B';
const IRAS = '#A98CBA';

// Egy darab: { t: 'SZÓ', c: INK } szöveg, { ring: true } gyűrű a kossal, { dbl: true, c } Ő.
export function renderWordmark({ parts, sub, fontPx }) {
  const F = fontPx;
  const fontData = Buffer.from(FREDOKA_BASE64, 'base64');
  const logo = `data:image/png;base64,${LOGO_PNG_BASE64}`;
  const letters = { display: 'flex', fontSize: F, fontFamily: 'Fredoka', fontWeight: 700, letterSpacing: Math.round(0.03 * F), lineHeight: 1 };
  const RING = Math.round((parts.ringSize || 1.14) * F);
  const accent = (dx, c) => (
    <div style={{ display: 'flex', position: 'absolute', left: dx, top: -Math.round(0.1 * F), width: Math.round(0.72 * F), height: Math.round(0.24 * F), overflow: 'hidden', transform: 'scaleX(0.72)' }}>
      <div style={{ ...letters, color: c, position: 'absolute', left: 0, top: Math.round(0.1 * F) }}>Ó</div>
    </div>
  );
  const el = (p, i) => {
    if (p.ring) {
      const size = Math.round((p.size || 1.14) * F);
      const border = Math.round((p.border || 0.12) * F);
      const lg = Math.round((size - 2 * border) * 1.407);
      return (
        <div key={i} style={{ display: 'flex', position: 'relative', width: size, height: size, margin: `0 ${Math.round((p.gap ?? 0.03) * F)}px`, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: size, height: size, border: `${border}px solid ${INK}`, borderRadius: size }} />
          <img src={logo} width={lg} height={lg} style={{ position: 'absolute', left: (size - lg) / 2, top: (size - lg) / 2 }} />
          {p.acute && (
            <div style={{ display: 'flex', position: 'absolute', left: Math.round(size / 2 - 0.3 * F), top: -Math.round(0.37 * F), width: Math.round(0.72 * F), height: Math.round(0.24 * F), overflow: 'hidden' }}>
              <div style={{ ...letters, color: INK, position: 'absolute', left: 0, top: Math.round(0.1 * F) }}>Ó</div>
            </div>
          )}
        </div>
      );
    }
    if (p.dbl) {
      return (
        <div key={i} style={{ display: 'flex', position: 'relative' }}>
          <div style={{ ...letters, color: p.c }}>O</div>
          {accent(-Math.round(0.17 * F), p.c)}
          {accent(Math.round(0.15 * F), p.c)}
        </div>
      );
    }
    return (
      <div key={i} style={{ ...letters, color: p.c, marginRight: p.space ? Math.round(0.28 * F) : 0 }}>
        {p.t}
      </div>
    );
  };
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0FC', gap: Math.round(F * 0.42) }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>{parts.map(el)}</div>
        <div style={{ display: 'flex', fontSize: 40, fontFamily: 'Nunito', fontWeight: 700, color: '#5A5270' }}>{sub}</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Fredoka', data: fontData, style: 'normal', weight: 700 },
        { name: 'Nunito', data: Buffer.from(NUNITO_700_BASE64, 'base64'), style: 'normal', weight: 700 },
      ],
    }
  );
}

export const OG = {
  napi: {
    alt: 'napititkos.hu – Titkosírás, Szókereső, Heti Mini',
    fontPx: 128,
    sub: 'Titkosírás · Szókereső · Heti Mini',
    parts: [{ t: 'NAPI', c: IRAS }, { t: 'TITK', c: INK }, { ring: true }, { t: 'S', c: INK }, { t: '.HU', c: IRAS }],
  },
  titkos: {
    alt: 'Titkosírás – napi kriptikus rejtvény',
    fontPx: 170,
    sub: 'napi kriptikus rejtvény · napititkos.hu',
    parts: [{ t: 'TITK', c: INK }, { ring: true }, { t: 'S', c: INK }, { t: 'ÍRÁS', c: IRAS }],
  },
  szo: {
    alt: 'Szókereső – minden nap új 3×3-as rács',
    fontPx: 160,
    sub: 'minden nap új szókereső · napititkos.hu',
    parts: [{ t: 'SZ', c: INK }, { ring: true, acute: true }, { t: 'KERES', c: IRAS }, { dbl: true, c: IRAS }],
  },
  mini: {
    alt: 'Heti Mini – hétfőnként új keresztrejtvény',
    fontPx: 180,
    sub: 'hétfőnként új keresztrejtvény · napititkos.hu',
    parts: [{ t: 'HETI', c: INK }, { ring: true, size: 1.2, border: 0.07, gap: 0.05 }, { t: 'MINI', c: IRAS }],
  },
};
