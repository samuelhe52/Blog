import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date(),
    lang: z.enum(['zh-CN', 'en']),
    translationSlug: z.string(),
    author: z.string().optional(),
    draft: z.boolean().optional()
  })
});

export const collections = { posts };
