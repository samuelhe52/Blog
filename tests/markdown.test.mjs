import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

const origin = 'https://blog.konakona.dev';
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
function document(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(match, 'document has frontmatter');
  return { data: yaml.load(match[1]), body: source.slice(match[0].length) };
}
function nodes(body) {
  const result = [];
  function walk(node) {
    result.push(node);
    node.children?.forEach(walk);
  }
  walk(parser.parse(body));
  return result;
}
const sources = await Promise.all((await files('src/content/posts'))
  .filter((path) => /\.mdx?$/.test(path)).map(async (path) => ({ path, ...document(await readFile(path, 'utf8')) })));
const published = sources.filter(({ data }) => !data.draft);
const llms = await readFile('dist/llms.txt', 'utf8');

test('every published route exports its actual language, content, and discoverable alternate', async () => {
  let expectedRoutes = 0;
  for (const source of published) {
    const { data } = source;
    const locales = [data.lang === 'en' ? 'en' : 'zh'];
    if (data.lang === 'zh-CN' && !published.some((other) => other.data.lang === 'en'
      && other.data.translationSlug === data.translationSlug)) locales.push('en');
    for (const locale of locales) {
      expectedRoutes++;
      const route = `/${locale}/posts/${data.translationSlug}/`;
      const output = document(await readFile(`dist${route}index.md`, 'utf8'));
      assert.equal(output.data.title, data.title, route);
      assert.equal(output.data.language, data.lang, route);
      assert.equal(output.data.canonical, `${origin}${route}`, route);
      assert.ok(output.data.author, route);
      assert.equal(Boolean(output.data.translationNotice), locale === 'en' && data.lang !== 'en', route);
      const originalNodes = nodes(source.body);
      const outputNodes = nodes(output.body);
      for (const type of ['code', 'inlineCode', 'math', 'inlineMath']) {
        assert.deepEqual(outputNodes.filter((node) => node.type === type).map((node) => [node.value, node.lang]),
          originalNodes.filter((node) => node.type === type).map((node) => [node.value, node.lang]), `${route}: ${type}`);
      }
      assert.equal(outputNodes.filter((node) => node.type === 'table').length,
        originalNodes.filter((node) => node.type === 'table').length, `${route}: tables`);
      for (const node of outputNodes.filter((node) => ['link', 'image', 'definition'].includes(node.type))) {
        const url = new URL(node.url);
        if (url.origin === origin) await access(`dist${decodeURI(url.pathname)}`);
      }
      for (const node of outputNodes.filter((node) => node.type === 'html')) {
        for (const match of node.value.matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/g)) {
          const url = new URL(match[1]);
          if (url.origin === origin) await access(`dist${decodeURI(url.pathname)}`);
        }
      }
      const html = await readFile(`dist${route}index.html`, 'utf8');
      assert.ok(html.includes(`rel="alternate" type="text/markdown" href="${origin}${route}index.md"`), route);
      assert.ok(html.includes(`href="${route}index.md" type="text/markdown"`), route);
      assert.ok(html.includes(`rel="describedby" href="${origin}/llms.txt"`), route);
      for (const other of published.filter((post) => post.data.translationSlug === data.translationSlug && post.data.lang !== data.lang)) {
        const translatedLocale = other.data.lang === 'en' ? 'en' : 'zh';
        assert.equal(output.data[`translation_${other.data.lang}`], `${origin}/${translatedLocale}/posts/${data.translationSlug}/`);
      }
    }
    const locale = data.lang === 'en' ? 'en' : 'zh';
    assert.ok(llms.includes(`${origin}/${locale}/posts/${data.translationSlug}/index.md`), source.path);
  }
  const generated = (await files('dist')).filter((path) => /\/(en|zh)\/posts\/.+\/index\.md$/.test(path));
  assert.equal(generated.length, expectedRoutes, 'no extra or draft exports');
});

test('discovery lists real language versions once and keeps HTML sitemap URLs', async () => {
  const markdownLinks = [...llms.matchAll(/\]\((https:\/\/[^)]+\/index\.md)\)/g)].map((match) => match[1]);
  assert.equal(markdownLinks.length, published.length);
  assert.equal(new Set(markdownLinks).size, markdownLinks.length);
  for (const path of (await files('dist')).filter((path) => /sitemap.*\.xml$/.test(path))) {
    assert.doesNotMatch(await readFile(path, 'utf8'), /index\.md|llms\.txt/);
  }
});
