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
          backgroundColor: '#EDEAE0',
          backgroundImage:
            'linear-gradient(#CFC8B3 1px, transparent 1px), linear-gradient(90deg, #CFC8B3 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '48px 72px',
            background: '#FBF9F3',
            border: '2px solid #CFC8B3',
            borderRadius: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, color: '#232420' }}>
              Titkos<span style={{ color: '#B8862E' }}>írás</span>
            </div>
            <div style={{ fontSize: 30, color: '#5B5A4F', marginTop: 6 }}>
              napi kriptikus rejtvény · napititkos.hu
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
