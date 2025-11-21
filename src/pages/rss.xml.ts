import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../site.config';

export async function GET(context) {
  const posts = await getCollection('posts', ({ data }) => data.lang === 'zh-CN' && !data.draft);
  
  const sortedPosts = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: SITE.title,
    description: 'konakona 的个人博客',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/zh/posts/${post.data.translationSlug}/`,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
