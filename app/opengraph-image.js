import { ImageResponse } from 'next/og';
import { FREDOKA_BASE64 } from './fredoka-font-data';
import { LOGO_PNG_BASE64 } from './logo-og-data';

export const runtime = 'nodejs';
export const alt = 'Titkosírás - napi kriptikus rejtvény';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Megosztási kép a fejléc stílusában (csupa nagybetűs TITKOSÍRÁS, az O helyén gyűrűben a logó),
// doboz nélkül. A logó pontosan a kép közepén van, vízszintesen és függőlegesen is: a felirat
// két fele (TITK és SÍRÁS) egyforma széles dobozban áll tőle balra és jobbra, a dobozok
// szélessége a hosszabbik félhez igazodik, és a teljes sor a kép szélességét kis margóval tölti ki.
// Arányok a fejlécből (em): TITK 2,236, SÍRÁS 2,758, gyűrű 1,14 (vastagsága 0,12), a logó lila
// korongja pontosan kitölti a gyűrű belsejét (a kép a lyuk 140,7%-a).
const MARGIN = 48;
const HALF_EM = 2.758 + 0.03; // a hosszabbik fél + a gyűrű melletti rés
const RING_EM = 1.14;
const F = Math.floor((size.width - 2 * MARGIN) / (2 * HALF_EM + RING_EM)); // betűméret, px
const SIDE = Math.round(HALF_EM * F);
const RING = Math.round(RING_EM * F);
const RING_BORDER = Math.round(0.12 * F);
const LOGO = Math.round((RING - 2 * RING_BORDER) * 1.407);
const CX = size.width / 2;
const CY = size.height / 2;

export default async function Image() {
  const fontData = Buffer.from(FREDOKA_BASE64, 'base64');
  const logoSrc = `data:image/png;base64,${LOGO_PNG_BASE64}`;
  const letters = { display: 'flex', fontSize: F, fontFamily: 'Fredoka', fontWeight: 700, letterSpacing: Math.round(0.03 * F), lineHeight: 1 };

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: '#F0F0FC' }}>
        {/* Bal fél: jobbra igazítva a gyűrűhöz */}
        <div style={{ display: 'flex', position: 'absolute', left: CX - RING / 2 - SIDE, top: CY - RING / 2, width: SIDE, height: RING, alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ ...letters, color: '#1F1A2B' }}>TITK</div>
        </div>
        {/* Gyűrű és logó: a kép közepén. Testvérelemek, hogy a lekerekített gyűrű ne vágja le
            a logóból kinyúló szarvakat és a nagyítót. */}
        <div style={{ display: 'flex', position: 'absolute', left: CX - RING / 2, top: CY - RING / 2, width: RING, height: RING, border: `${RING_BORDER}px solid #1F1A2B`, borderRadius: RING }} />
        <img src={logoSrc} width={LOGO} height={LOGO} style={{ position: 'absolute', left: CX - LOGO / 2, top: CY - LOGO / 2 }} />
        {/* Jobb fél: balra igazítva a gyűrűhöz */}
        <div style={{ display: 'flex', position: 'absolute', left: CX + RING / 2, top: CY - RING / 2, width: SIDE, height: RING, alignItems: 'center', justifyContent: 'flex-start' }}>
          <div style={{ ...letters, color: '#1F1A2B' }}>S</div>
          <div style={{ ...letters, color: '#A98CBA' }}>ÍRÁS</div>
        </div>
        <div style={{ display: 'flex', position: 'absolute', left: 0, width: size.width, top: CY + RING / 2 + 34, justifyContent: 'center', fontSize: 38, fontFamily: 'Fredoka', fontWeight: 700, color: '#5A5270' }}>
          napi kriptikus rejtvény · napititkos.hu
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Fredoka', data: fontData, style: 'normal', weight: 700 }] }
  );
}
