import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

/** Ícone do app (PWA / abas). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #2563eb 0%, #1e40af 100%)',
          color: 'white',
          fontSize: 280,
          fontWeight: 800,
          letterSpacing: '-0.05em',
        }}
      >
        T
      </div>
    ),
    { ...size }
  );
}
