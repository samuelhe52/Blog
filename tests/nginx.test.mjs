import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

test('Nginx serves and negotiates the generated article representations', { skip: !process.env.NGINX_BIN }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'blog-markdown-nginx-'));
  const socket = createServer();
  await new Promise((done) => socket.listen(0, '127.0.0.1', done));
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  const origin = `http://127.0.0.1:${port}`;
  const source = await readFile('infra/nginx/blog.conf', 'utf8');
  const maps = source.slice(0, source.indexOf('\nserver {'));
  const production = source.match(/server \{\n    listen 443 ssl;[\s\S]*?\n\}/)[0];
  const server = production
    .replace('listen 443 ssl;', `listen 127.0.0.1:${port};`)
    .replace(/^    listen \[::\]:443 ssl;\n/m, '')
    .replace(/^    (?:ssl_\w+ .*|include \/etc\/letsencrypt\/.*);\n/gm, '')
    .replace('root /var/www/blog/dist;', `root "${resolve('dist')}";`);
  const config = `pid ${directory}/nginx.pid;\nerror_log ${directory}/error.log;\nevents {}\nhttp {\naccess_log off;\ntypes { text/html html; text/plain txt; }\n${maps}\n${server}\n}`;
  const configPath = join(directory, 'nginx.conf');
  await writeFile(configPath, config);
  const args = ['-p', `${directory}/`, '-c', configPath];
  const check = spawnSync(process.env.NGINX_BIN, [...args, '-t'], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  const child = spawn(process.env.NGINX_BIN, [...args, '-g', 'daemon off; master_process off;'], { stdio: 'ignore' });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const response = await fetch(`${origin}/healthz`);
        ready = response.status === 204;
        if (ready) break;
      } catch {}
      await setTimeout(20);
    }
    assert.ok(ready, await readFile(join(directory, 'error.log'), 'utf8'));
    async function files(path) {
      const entries = await readdir(path, { withFileTypes: true });
      return (await Promise.all(entries.map((entry) => entry.isDirectory()
        ? files(join(path, entry.name)) : join(path, entry.name)))).flat();
    }
    const articles = (await files('dist')).filter((path) => /\/(en|zh)\/posts\/.+\/index\.md$/.test(path));
    for (const path of articles) {
      const route = path.slice(4, -'index.md'.length);
      const expected = await readFile(path, 'utf8');
      const md = await fetch(`${origin}${route}`, { headers: { Accept: 'text/markdown' } });
      assert.equal(md.status, 200, route);
      assert.match(md.headers.get('content-type'), /^text\/markdown; charset=utf-8$/i, route);
      assert.equal(md.headers.get('vary'), 'Accept', route);
      assert.equal(md.headers.get('x-content-type-options'), 'nosniff', route);
      assert.ok(md.headers.get('content-security-policy'), route);
      assert.equal(await md.text(), expected, route);
      const direct = await fetch(`${origin}${route}index.md`, { headers: { Accept: 'text/html' } });
      assert.equal(direct.status, 200, route);
      assert.equal(direct.headers.get('content-type'), md.headers.get('content-type'), route);
      assert.equal(await direct.text(), expected, route);
      const html = await fetch(`${origin}${route}`);
      assert.equal(html.status, 200, route);
      assert.match(html.headers.get('content-type'), /^text\/html/, route);
      assert.equal(html.headers.get('vary'), 'Accept', route);
      assert.equal(await html.text(), await readFile(`${path.slice(0, -2)}html`, 'utf8'), route);
      assert.notEqual(html.headers.get('etag'), md.headers.get('etag'), route);
    }
    const route = '/en/posts/nitp/';
    for (const accept of ['*/*', 'text/*', 'text/html,application/xhtml+xml,*/*;q=0.8', 'text/markdown;q=0',
      'text/markdown;q=0.000, text/html', 'text/markdown; charset=utf-8; q=0.0', 'application/text/markdown']) {
      const response = await fetch(`${origin}${route}`, { headers: { Accept: accept } });
      assert.match(response.headers.get('content-type'), /^text\/html/, accept);
      await response.arrayBuffer();
    }
    for (const accept of ['TEXT/MARKDOWN', 'text/markdown; charset=utf-8', 'text/markdown;q=0.001',
      'text/html;q=0.5, text/markdown;q=1', 'text/markdown, */*;q=0.1']) {
      const response = await fetch(`${origin}${route}?check=1`, { headers: { Accept: accept } });
      assert.match(response.headers.get('content-type'), /^text\/markdown/, accept);
      assert.equal(response.headers.get('vary'), 'Accept', accept);
      await response.arrayBuffer();
    }
    for (const route of ['/en/posts/unknown-post/', '/zh/posts/unknown-post/index.md', '/en/posts/nitp/unknown.md']) {
      const response = await fetch(`${origin}${route}`, { headers: { Accept: 'text/markdown' } });
      assert.equal(response.status, 404, route);
      await response.arrayBuffer();
    }
    const missingSlash = await fetch(`${origin}/en/posts/nitp`, { redirect: 'manual', headers: { Accept: 'text/markdown' } });
    assert.equal(missingSlash.status, 301);
    assert.equal(missingSlash.headers.get('location'), `${origin}/en/posts/nitp/`);
    await missingSlash.arrayBuffer();
    const md = await fetch(`${origin}${route}`, { method: 'HEAD', headers: { Accept: 'text/markdown' } });
    assert.equal(md.status, 200);
    assert.equal(await md.text(), '');
    const unchanged = await fetch(`${origin}${route}`, { headers: { Accept: 'text/markdown', 'If-None-Match': md.headers.get('etag') } });
    assert.equal(unchanged.status, 304);
    assert.equal(unchanged.headers.get('vary'), 'Accept');
    const htmlWithMdTag = await fetch(`${origin}${route}`, { headers: { Accept: 'text/html', 'If-None-Match': md.headers.get('etag') } });
    assert.equal(htmlWithMdTag.status, 200);
    await htmlWithMdTag.arrayBuffer();
    for (const route of ['/en/posts/', '/zh/posts/', '/']) {
      const response = await fetch(`${origin}${route}`, { headers: { Accept: 'text/markdown' } });
      assert.match(response.headers.get('content-type'), /^text\/html/, route);
      await response.arrayBuffer();
    }
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise((done) => child.once('exit', done));
    }
    await rm(directory, { recursive: true, force: true });
  }
});
