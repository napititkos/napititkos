import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const alt = 'Titkosírás — napi kriptikus rejtvény';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const fontPath = path.join(process.cwd(), 'app', 'fredoka.ttf');
  const fontData = fs.readFileSync(fontPath);

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
          backgroundColor: '#FFF7F2',
          backgroundImage: 'radial-gradient(circle, #E8CFF0 2.4px, transparent 2.4px)',
          backgroundSize: '42px 42px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '48px 72px',
            background: '#FFFFFF',
            border: '3px solid #E8CFF0',
            borderRadius: 32,
            boxShadow: '0 10px 40px rgba(140,100,160,0.15)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 96,
                fontFamily: 'Fredoka',
                fontWeight: 700,
                color: '#3D3452',
                letterSpacing: 1,
              }}
            >
              Titkos<span style={{ color: '#D6456B' }}>írás</span>
            </div>
            <div
              style={{
                fontSize: 30,
                fontFamily: 'Fredoka',
                fontWeight: 500,
                color: '#8B84A3',
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
