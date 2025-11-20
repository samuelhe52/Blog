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
  return `/posts/${translationSlug}/`;
}
