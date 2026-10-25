import type { APIRoute, GetStaticPaths } from 'astro';
import { getPostRoutes, getPublishedPosts, type Post } from '../../../../utils/publishedPosts';
import { renderMarkdown } from '../../../../utils/markdown';
import type { Locale } from '../../../../utils/postLinks';

export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  return getPostRoutes(posts).map(({ post, lang }) => ({
    params: { locale: lang === 'zh-CN' ? 'zh' : 'en', translationSlug: post.data.translationSlug },
    props: { post, lang, posts },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { post, lang, posts } = props as { post: Post; lang: Locale; posts: Post[] };
  return new Response(renderMarkdown(post, lang, posts), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
