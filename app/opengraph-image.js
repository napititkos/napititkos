import { ImageResponse } from 'next/og';
import { FREDOKA_BASE64 } from './fredoka-font-data';
import { LOGO_PNG_BASE64 } from './logo-og-data';

export const runtime = 'nodejs';
export const alt = 'Titkosírás - napi kriptikus rejtvény';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Megosztási kép: a fejléc stílusában (csupa nagybetűs TITKOSÍRÁS, az O helyén gyűrűben a logó),
// doboz nélkül, kis margóval a kép teljes szélességét kitöltve. A méretek a fejléc arányaiból
// (em-ben mérve) számolva: a felirat 6,19 em széles, a gyűrű 1,14 em, vastagsága 0,12 em, a
// logó lila korongja pontosan kitölti a gyűrű belsejét (a kép a lyuk 140,7%-a).
const MARGIN = 48;
const TEXT_EM = 6.194;
const F = Math.floor((size.width - 2 * MARGIN) / TEXT_EM); // betűméret, px
const RING = Math.round(1.14 * F);
const RING_BORDER = Math.round(0.12 * F);
const HOLE = RING - 2 * RING_BORDER;
const LOGO = Math.round(HOLE * 1.407);

export default async function Image() {
  const fontData = Buffer.from(FREDOKA_BASE64, 'base64');
  const logoSrc = `data:image/png;base64,${LOGO_PNG_BASE64}`;
  const letters = { display: 'flex', fontSize: F, fontFamily: 'Fredoka', fontWeight: 700, letterSpacing: Math.round(0.03 * F), lineHeight: 1 };

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
          backgroundColor: '#F0F0FC',
          backgroundImage: 'radial-gradient(circle, #DCD3E8 2.4px, transparent 2.4px)',
          backgroundSize: '42px 42px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ ...letters, color: '#1F1A2B' }}>TITK</div>
          {/* A gyűrű és a logó testvérelemek: a lekerekített elem levágná a gyermekét, így a
              szarvak és a nagyító (a weboldal fejlécéhez hasonlóan) átnyúlhatnak a gyűrűn. */}
          <div style={{ display: 'flex', position: 'relative', width: RING, height: RING, margin: `0 ${Math.round(0.03 * F)}px` }}>
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                left: 0,
                top: 0,
                width: RING,
                height: RING,
                border: `${RING_BORDER}px solid #1F1A2B`,
                borderRadius: RING,
              }}
            />
            <img
              src={logoSrc}
              width={LOGO}
              height={LOGO}
              style={{ position: 'absolute', left: (RING - LOGO) / 2, top: (RING - LOGO) / 2 }}
            />
          </div>
          <div style={{ ...letters, color: '#1F1A2B' }}>S</div>
          <div style={{ ...letters, color: '#A98CBA' }}>ÍRÁS</div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 40,
            fontFamily: 'Fredoka',
            fontWeight: 700,
            color: '#5A5270',
            marginTop: 26,
          }}
        >
          napi kriptikus rejtvény · napititkos.hu
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Fredoka', data: fontData, style: 'normal', weight: 700 }],
    }
  );
}
