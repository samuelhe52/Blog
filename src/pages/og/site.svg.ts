export async function GET() {
  const width = 1200;
  const height = 630;
  const bgColor = '#0a0a0a';
  const textColor = '#e5e5e5';
  const accentColor = '#60a5fa';

  const svg = `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
  >
    <rect width="${width}" height="${height}" fill="${bgColor}" />
    
    <rect x="80" y="200" width="8" height="230" fill="${accentColor}" rx="4" />
    
    <text
      x="120"
      y="320"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      font-size="80"
      font-weight="700"
      fill="${textColor}"
    >
      konakona's Lodge
    </text>
    
    <text
      x="120"
      y="400"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      font-size="36"
      font-weight="400"
      fill="#999"
    >
      konakona 的个人博客
    </text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
