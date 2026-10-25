import { posix } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root, RootContent } from 'mdast';
import { SITE } from '../site.config';
import { buildPostUrl, type Locale } from './postLinks';
import type { Post } from './publishedPosts';

const assets = import.meta.glob<string>(
  '/src/content/posts/**/*.{png,jpg,jpeg,gif,svg,webp,avif,pdf}',
  { eager: true, query: '?url', import: 'default' }
);
const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
  .use(remarkStringify, { fences: true, bullet: '-', listItemIndent: 'one' });

export function renderMarkdown(post: Post, routeLang: Locale, posts: Post[]) {
  const canonical = new URL(buildPostUrl(post.data.translationSlug, routeLang), SITE.domain).href;
  const resolveUrl = (url: string) => {
    if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
    const [path] = url.split(/[?#]/);
    const assetPath = posix.normalize(posix.join('/src/content/posts', posix.dirname(post.id), decodeURI(path)));
    const asset = assets[assetPath];
    const linkedPost = posts.find((other) => `/src/content/posts/${other.id}` === assetPath);
    if (!url.startsWith('/') && linkedPost) {
      return new URL(buildPostUrl(linkedPost.data.translationSlug, linkedPost.data.lang), SITE.domain).href
        + url.slice(path.length);
    }
    if (!url.startsWith('/') && asset) {
      return new URL(asset, SITE.domain).href + url.slice(path.length);
    }
    return new URL(url, canonical).href;
  };

  const tree = markdown.parse(post.body);
  function rewrite(node: Root | RootContent) {
    if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
      node.url = resolveUrl(node.url);
    } else if (node.type === 'html') {
      node.value = node.value.replace(/\b(href|src|poster)\s*=\s*(["'])(.*?)\2/gi,
        (_, name, quote, url) => `${name}=${quote}${resolveUrl(url)}${quote}`);
    }
    if ('children' in node) node.children.forEach(rewrite);
  }
  rewrite(tree);

  const translations = posts.filter((other) => other.data.translationSlug === post.data.translationSlug
    && other.data.lang !== post.data.lang);
  const metadata = {
    title: post.data.title,
    author: post.data.author ?? `${SITE.author.handle} (${SITE.author.name})`,
    date: post.data.date.toISOString().slice(0, 10),
    language: post.data.lang,
    canonical,
    ...(post.data.description ? { description: post.data.description } : {}),
    ...(routeLang !== post.data.lang ? { translationNotice: 'English translation unavailable; this is the Chinese original.' } : {}),
    ...Object.fromEntries(translations.map((other) => [
      `translation_${other.data.lang}`,
      new URL(buildPostUrl(other.data.translationSlug, other.data.lang), SITE.domain).href
    ])),
  };
  const frontmatter = Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
  return `---\n${frontmatter}\n---\n\n# ${post.data.title}\n\n${markdown.stringify(tree)}`;
}
