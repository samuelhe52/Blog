import { getCollection, type CollectionEntry } from 'astro:content';

export type Locale = 'zh-CN' | 'en';

export async function getPostByTranslationSlug(translationSlug: string, preferredLang: Locale): Promise<{
  entry: CollectionEntry<'posts'> | null;
  lang: Locale;
}> {
  const all = await getCollection('posts');
  const preferred = all.find(
    (p) => p.data.translationSlug === translationSlug && p.data.lang === preferredLang
  ) ?? null;
  if (preferred) return { entry: preferred, lang: preferredLang };

  const fallbackLang: Locale = preferredLang === 'zh-CN' ? 'en' : 'zh-CN';
  const fallback = all.find(
    (p) => p.data.translationSlug === translationSlug && p.data.lang === fallbackLang
  ) ?? null;

  if (fallback) return { entry: fallback, lang: fallbackLang };
  return { entry: null, lang: preferredLang };
}

export function buildPostUrl(translationSlug: string, lang: Locale): string {
  if (lang === 'en') return `/en/posts/${translationSlug}/`;
  return `/zh/posts/${translationSlug}/`;
}

export interface AdjacentPost {
  title: string;
  href: string;
}

function folderOf(entry: CollectionEntry<'posts'>): string {
  const parts = entry.id.split('/').slice(1, -1);
  return parts.join('/');
}

/**
 * Older and newer neighbours of a post within the same folder, using the
 * posts that render under the given route language (en routes fall back to
 * zh-only posts, zh routes list zh posts only).
 */
export async function getAdjacentPosts(translationSlug: string, routeLang: Locale): Promise<{
  older: AdjacentPost | null;
  newer: AdjacentPost | null;
}> {
  const all = await getCollection('posts', ({ data }) => !data.draft);
  const bySlug = new Map<string, CollectionEntry<'posts'>>();
  for (const entry of all) {
    const existing = bySlug.get(entry.data.translationSlug);
    if (entry.data.lang === routeLang || (!existing && routeLang === 'en')) {
      bySlug.set(entry.data.translationSlug, entry);
    }
  }

  const current = bySlug.get(translationSlug);
  if (!current) return { older: null, newer: null };

  const siblings = [...bySlug.values()]
    .filter((entry) => folderOf(entry) === folderOf(current))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const index = siblings.indexOf(current);
  const toLink = (entry?: CollectionEntry<'posts'>): AdjacentPost | null =>
    entry ? { title: entry.data.title, href: buildPostUrl(entry.data.translationSlug, routeLang) } : null;

  return { older: toLink(siblings[index + 1]), newer: toLink(siblings[index - 1]) };
}
