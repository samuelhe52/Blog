import { getCollection } from 'astro:content';
import { pngResponse, renderPostOg } from '../../utils/og';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.filter(p => p.data.translationSlug).map((post) => ({
    params: { slug: `${post.data.lang === 'en' ? 'en-' : ''}${post.data.translationSlug}` },
    props: { post }
  }));
}

export async function GET({ props }: any) {
  const { title, description, date, lang } = props.post.data;
  return pngResponse(await renderPostOg({ title, description, date, lang }));
}
