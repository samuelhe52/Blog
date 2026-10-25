import { SITE } from '../site.config';
import { buildMarkdownUrl, getPublishedPosts } from '../utils/publishedPosts';

export async function GET() {
  const posts = await getPublishedPosts();
  const lines = [
    `# ${SITE.title}`,
    '',
    `> A bilingual personal blog by ${SITE.author.handle} (${SITE.author.name}), covering programming, AI, and research notes.`,
    '',
    'Chinese articles live under /zh/ and English articles under /en/. The root uses browser language detection; start at a localized archive instead.',
    'Each article has a static Markdown representation at its HTML URL followed by index.md. Metadata identifies the actual content language, canonical HTML URL, and available translation.',
    'English article routes may show a Chinese original when no English translation exists. The lists below include each published language version once.',
    '',
    '## Navigation',
    '',
    `- [Chinese archive](${SITE.domain}/zh/posts/): All Chinese articles.`,
    `- [English archive](${SITE.domain}/en/posts/): English articles, with Chinese fallbacks.`,
    `- [Chinese RSS](${SITE.domain}/rss.xml)`,
    `- [English RSS](${SITE.domain}/en/rss.xml)`,
    `- [Sitemap](${SITE.domain}/sitemap-index.xml)`,
  ];
  for (const [lang, heading] of [['zh-CN', 'Chinese articles'], ['en', 'English articles']] as const) {
    lines.push('', `## ${heading}`, '');
    const localized = posts.filter((post) => post.data.lang === lang)
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.translationSlug.localeCompare(b.data.translationSlug));
    for (const post of localized) {
      const title = post.data.title.replace(/([\\\[\]])/g, '\\$1').replace(/\s+/g, ' ');
      const description = post.data.description?.replace(/\s+/g, ' ');
      lines.push(`- [${title}](${SITE.domain}${buildMarkdownUrl(post.data.translationSlug, lang)})${description ? `: ${description}` : ''}`);
    }
  }
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
