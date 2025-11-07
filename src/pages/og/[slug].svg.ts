import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((post) => ({
    params: { slug: `${post.data.lang === 'en' ? 'en-' : ''}${post.data.translationSlug}` },
    props: { post }
  }));
}

export async function GET({ props }: any) {
  const { post } = props;
  const { title, description, date, lang } = post.data;

  const width = 1200;
  const height = 630;
  const bgColor = lang === 'zh-CN' ? '#0a0a0a' : '#1a1a1a';
  const textColor = '#e5e5e5';
  const accentColor = '#60a5fa';

  const formattedDate = date.toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const svg = `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
  >
    <rect width="${width}" height="${height}" fill="${bgColor}" />
    
    <rect x="80" y="80" width="6" height="120" fill="${accentColor}" rx="3" />
    
    <text
      x="120"
      y="150"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      font-size="64"
      font-weight="700"
      fill="${textColor}"
    >
      ${title.length > 40 ? title.substring(0, 37) + '...' : title}
    </text>
    
    ${description ? `<text
      x="120"
      y="230"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      font-size="32"
      font-weight="400"
      fill="#999"
    >
      ${description.length > 80 ? description.substring(0, 77) + '...' : description}
    </text>` : ''}
    
    <text
      x="120"
      y="520"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      font-size="28"
      font-weight="400"
      fill="#666"
    >
      ${formattedDate}
    </text>
    
    <text
      x="120"
      y="560"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      font-size="28"
      font-weight="600"
      fill="${accentColor}"
    >
      konakona's Lodge
    </text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
