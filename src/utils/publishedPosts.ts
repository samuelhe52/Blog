import { getCollection, type CollectionEntry } from 'astro:content';
import { buildPostUrl, type Locale } from './postLinks';

export type Post = CollectionEntry<'posts'>;

export async function getPublishedPosts() {
  return getCollection('posts', ({ data }) => !data.draft);
}

export function getPostRoutes(posts: Post[]) {
  return posts.flatMap((post) => {
    const routes = [{ post, lang: post.data.lang as Locale }];
    if (post.data.lang === 'zh-CN' && !posts.some(
      (other) => other.data.translationSlug === post.data.translationSlug && other.data.lang === 'en'
    )) {
      routes.push({ post, lang: 'en' });
    }
    return routes;
  });
}

export function buildMarkdownUrl(slug: string, lang: Locale) {
  return `${buildPostUrl(slug, lang)}index.md`;
}
