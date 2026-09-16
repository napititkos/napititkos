import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Titkosírás — napi kriptikus rejtvény';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
          backgroundColor: '#FFF8F0',
          backgroundImage: 'radial-gradient(circle, #EAD9F0 2px, transparent 2px)',
          backgroundSize: '40px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '48px 72px',
            background: '#FFFFFF',
            border: '3px solid #EAD9F0',
            borderRadius: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, color: '#3D3452' }}>
              Titkos<span style={{ color: '#FF8FA3' }}>írás</span>
            </div>
            <div style={{ fontSize: 30, color: '#8B84A3', marginTop: 6 }}>
              napi kriptikus rejtvény · napititkos.hu
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
