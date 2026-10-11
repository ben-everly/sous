import { ImageResponse } from 'next/og'

export const alt = 'Sous - Home Kitchen Management'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafaf9',
        color: '#1c1917',
      }}
    >
      <div style={{ fontSize: 200, fontWeight: 700, letterSpacing: -6 }}>Sous</div>
      <div style={{ fontSize: 48, color: '#57534e' }}>Home Kitchen Management</div>
    </div>,
    size,
  )
}
