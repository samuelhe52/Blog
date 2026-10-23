import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const layout = await readFile(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
const loader = layout.match(/<script is:inline src="\/scripts\/analytics\.js(?:\?[^\"]*)?"[^>]*><\/script>/)?.[0]?.replace(' is:inline', '');
if (!loader) throw new Error('Missing analytics loader in Layout.astro');

async function addAnalytics(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await addAnalytics(path);
    } else if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      if (html.includes('src="/scripts/analytics.js')) continue;
      const closingTag = /<\/(head|body|html)>/i;
      await writeFile(path, closingTag.test(html)
        ? html.replace(closingTag, `${loader}$&`)
        : `${html}\n${loader}\n`);
    }
  }
}

// Standalone lab pages, slides and redirects don't use the shared Astro layout.
await addAnalytics(fileURLToPath(new URL('../dist/', import.meta.url)));
