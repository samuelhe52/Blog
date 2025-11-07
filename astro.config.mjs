import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://blog.konakona52.com',
  trailingSlash: 'always',
  integrations: [mdx()]
});
