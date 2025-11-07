import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const base = (site && site.href) || 'https://blog.mydomain.com/';
  const posts = await getCollection('posts');
  const map = new Map<string, { zh?: string; en?: string }>();
  for (const p of posts) {
    const slug = p.data.translationSlug;
    const url = new URL(`/${p.data.lang === 'en' ? 'en/' : ''}posts/${slug}/`, base).href;
    const curr = map.get(slug) || {};
    if (p.data.lang === 'en') curr.en = url; else curr.zh = url;
    map.set(slug, curr);
  }
  const urls: Array<{ zh?: string; en?: string }> = [
    { zh: new URL('/', base).href, en: new URL('/en/', base).href }
  ];
  for (const [, pair] of map) urls.push(pair);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map((u) => {
    const zh = u.zh; const en = u.en; const primary = zh || en!;
    return `<url>\n  <loc>${primary}</loc>\n  ${zh ? `<xhtml:link rel="alternate" hreflang="zh-CN" href="${zh}"/>` : ''}\n  ${en ? `<xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"${en}\"/>` : ''}\n</url>`;
  }).join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
