import { ImageResponse } from 'next/og';
import { FREDOKA_BASE64 } from './fredoka-font-data';

export const runtime = 'nodejs';
export const alt = 'Titkosírás - napi kriptikus rejtvény';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const fontData = Buffer.from(FREDOKA_BASE64, 'base64');

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '48px 72px',
            background: '#FFFFFF',
            border: '3px solid #DCD3E8',
            borderRadius: 32,
            boxShadow: '0 10px 40px rgba(80,60,110,0.15)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 96,
                fontFamily: 'Fredoka',
                fontWeight: 700,
                color: '#1F1A2B',
                letterSpacing: 1,
              }}
            >
              Titkos<span style={{ color: '#A98CBA' }}>írás</span>
            </div>
            <div
              style={{
                fontSize: 30,
                fontFamily: 'Fredoka',
                fontWeight: 500,
                color: '#5A5270',
                marginTop: 10,
              }}
            >
              napi kriptikus rejtvény · napititkos.hu
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Fredoka', data: fontData, style: 'normal', weight: 700 },
      ],
    }
  );
}
