import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import wawoff2 from 'wawoff2';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const C = {
  bg: '#fbf7ef',
  dot: 'rgba(120, 100, 70, 0.18)',
  note: '#fbefc8',
  text: '#3a322b',
  muted: '#7a6b5e',
  moss: '#55703f',
  apricot: '#e9a35e',
  tape: 'rgba(233, 163, 94, 0.55)',
  seal: '#c4402e',
  sealInk: '#fff6ea',
};

// Young Serif "k" (units per em 1000, y-up; ink spans x 15–624, y 0–800)
const SEAL_K_PATH =
  'M611 60Q624 60 624 45V15Q624 0 609 0H364Q349 0 349 15V46Q349 60 362 60H377Q387 60 395.5 64.0Q404 68 404 75Q404 82 396 90L264 233L243 214V155Q243 116 246.5 95.5Q250 75 261.5 67.5Q273 60 297 60Q312 60 312 45V15Q312 0 297 0H30Q15 0 15 15V45Q15 60 30 60Q67 60 85.0 87.5Q103 115 103 155V530Q103 557 99.5 582.0Q96 607 83.5 624.5Q71 642 43 645Q32 646 32 658V692Q32 698 35.5 700.5Q39 703 46 705Q126 731 170.0 757.0Q214 783 234 798Q237 800 239 800H241Q243 800 243 798V302L365 413Q373 421 373 427Q373 440 353 440H323Q310 440 310 455V485Q310 500 325 500H547Q562 500 562 485V455Q562 440 549 440H537Q508 440 485.5 425.0Q463 410 424 375L347 306L561 91Q578 74 588.0 67.0Q598 60 608 60Z';

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, props: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: children.length === 0 ? props : { ...props, children: children.length === 1 ? children[0] : children },
});

/* ---------- fonts ---------- */

const require = createRequire(import.meta.url);
const pkgFile = (pkg: string, file: string) => join(dirname(require.resolve(`${pkg}/package.json`)), file);

type SatoriFont = { name: string; data: ArrayBuffer; weight: 400 | 500; style: 'normal' };
// Satori reads the whole backing ArrayBuffer, so hand it an exact copy rather than a Buffer view into a larger pool.
const exact = (u8: Uint8Array): ArrayBuffer => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
const readFont = (pkg: string, file: string) => exact(readFileSync(pkgFile(pkg, file)));
const latinFonts: SatoriFont[] = [
  { name: 'Young Serif', data: readFont('@fontsource/young-serif', 'files/young-serif-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Literata', data: readFont('@fontsource/literata', 'files/literata-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Literata', data: readFont('@fontsource/literata', 'files/literata-latin-500-normal.woff'), weight: 500, style: 'normal' },
  { name: 'Literata', data: readFont('@fontsource/literata', 'files/literata-latin-ext-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Kalam', data: readFont('@fontsource/kalam', 'files/kalam-latin-400-normal.woff'), weight: 400, style: 'normal' },
];

// WenKai ships as ~100 unicode-range WOFF2 slices; Satori needs TTF/WOFF, so decompress only the slices a card uses.
const wenkaiCss = pkgFile('lxgw-wenkai-screen-webfont', 'lxgwwenkaigbscreen.css');
const wenkaiSlices = [...readFileSync(wenkaiCss, 'utf8').matchAll(/url\('\.\/(files\/[^']+\.woff2)'\)[^}]*unicode-range:\s*([^;}]+)/g)].map(
  ([, file, ranges]) => ({
    file,
    ranges: ranges.split(',').map((r) => {
      const [lo, hi] = r.trim().replace(/^U\+/i, '').split('-');
      return [parseInt(lo, 16), parseInt(hi ?? lo, 16)] as const;
    }),
  })
);
const wenkaiCache = new Map<string, ArrayBuffer>();

async function wenkaiFor(text: string): Promise<SatoriFont[]> {
  const codes = [...new Set([...text].map((ch) => ch.codePointAt(0)!))];
  const files = wenkaiSlices
    .filter((s) => codes.some((cp) => s.ranges.some(([lo, hi]) => cp >= lo && cp <= hi)))
    .map((s) => s.file);
  const fonts: SatoriFont[] = [];
  // Sequential on purpose: wawoff2 returns a view into shared WASM memory that the next call overwrites.
  for (const file of files) {
    if (!wenkaiCache.has(file)) {
      wenkaiCache.set(file, exact(await wawoff2.decompress(readFileSync(join(dirname(wenkaiCss), file)))));
    }
    // Satori keeps one font per family name, so each slice gets its own name and the stack lists them all.
    fonts.push({ name: `WenKai ${file}`, data: wenkaiCache.get(file)!, weight: 400, style: 'normal' });
  }
  return fonts;
}

const stack = (fonts: SatoriFont[], fallback: string) => [...fonts.map((f) => `'${f.name}'`), fallback].join(', ');

/* ---------- sizing ---------- */

const WIDE = /[⺀-鿿豈-﫿＀-￯　-〿]/;
function charWidth(ch: string): number {
  if (WIDE.test(ch)) return 1;
  if (ch === ' ') return 0.28;
  if (/[A-Z0-9]/.test(ch)) return 0.66;
  if (/[il.,:;'!|()[\]-]/.test(ch)) return 0.32;
  return 0.54;
}

/** Largest font size (stepping down) at which `text` likely fits in `maxLines` lines. */
function fitFontSize(text: string, sizes: number[], maxWidth: number, maxLines: number): number {
  const ems = [...text].reduce((sum, ch) => sum + charWidth(ch), 0);
  return sizes.find((size) => (ems * size) / maxWidth <= maxLines * 0.92) ?? sizes[sizes.length - 1];
}

/* ---------- layout ---------- */

const seal = () =>
  h(
    'svg',
    { width: 64, height: 64, viewBox: '0 0 100 100', style: { transform: 'rotate(-5deg)' } },
    h('rect', { width: 100, height: 100, rx: 14, fill: C.seal }),
    h('rect', { x: 6, y: 6, width: 88, height: 88, rx: 9, fill: 'none', stroke: C.sealInk, 'stroke-opacity': 0.7, 'stroke-width': 3 }),
    h('path', { d: SEAL_K_PATH, fill: C.sealInk, transform: 'translate(28 81) scale(0.072 -0.072)' })
  );

const squiggle = (width: number) =>
  h(
    'svg',
    { width, height: 12, viewBox: `0 0 ${width} 12` },
    h('path', {
      d: `M2 6 ${Array.from({ length: Math.floor((width - 4) / 24) }, () => 'q6 -6 12 0 t12 0').join(' ')}`,
      fill: 'none',
      stroke: C.apricot,
      'stroke-width': 4,
      'stroke-linecap': 'round',
    })
  );

function frame(noteChildren: Node[]): Node {
  return h(
    'div',
    {
      style: {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 80px 56px',
        backgroundColor: C.bg,
        backgroundImage: `radial-gradient(circle, ${C.dot} 1.6px, transparent 1.8px)`,
        backgroundSize: '24px 24px',
      },
    },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 22 } },
      seal(),
      h('div', { style: { fontFamily: 'Literata', fontWeight: 500, fontSize: 38, color: C.text } }, 'konakona')
    ),
    h(
      'div',
      {
        style: {
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          marginTop: 44,
          padding: '62px 52px 40px',
          backgroundColor: C.note,
          borderRadius: 4,
          boxShadow: '0 16px 30px rgba(90, 60, 20, 0.22)',
          transform: 'rotate(-0.8deg)',
        },
      },
      h('div', { style: { position: 'absolute', top: -18, left: 450, width: 140, height: 36, backgroundColor: C.tape, transform: 'rotate(2deg)' } }),
      ...noteChildren
    )
  );
}

function footer(left: Node | null): Node {
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 18 } },
    left ?? h('div', {}),
    h('div', { style: { fontFamily: 'Literata', fontSize: 24, color: C.muted } }, 'blog.konakona.dev')
  );
}

async function toPng(tree: Node, cjkFonts: SatoriFont[]): Promise<Buffer> {
  const svg = await satori(tree as any, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [...latinFonts, ...cjkFonts],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH }, font: { loadSystemFonts: false } }).render().asPng();
}

export async function renderPostOg(opts: { title: string; description?: string; date: Date; lang: 'zh-CN' | 'en' }): Promise<Buffer> {
  const { title, description, date, lang } = opts;
  const zh = lang === 'zh-CN';
  const titleSize = fitFontSize(title, [60, 54, 48], 990, 2);
  const dateText = date.toLocaleDateString(zh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const cjk = zh ? await wenkaiFor(`${title}${description ?? ''}${dateText}`) : [];
  const serif = zh ? stack(cjk, 'Young Serif') : 'Young Serif';
  const body = zh ? stack(cjk, 'Literata') : 'Literata';
  const hand = zh ? stack(cjk, 'Kalam') : 'Kalam';

  const tree = frame([
    h(
      'div',
      {
        style: {
          display: 'block',
          lineClamp: 3,
          fontFamily: serif,
          fontSize: titleSize,
          lineHeight: 1.25,
          color: C.text,
        },
      },
      title
    ),
    h('div', { style: { display: 'flex', marginTop: 14 } }, squiggle(170)),
    ...(description
      ? [
          h(
            'div',
            {
              style: {
                display: 'block',
                lineClamp: 2,
                marginTop: 18,
                fontFamily: body,
                fontSize: 28,
                lineHeight: 1.45,
                color: C.muted,
              },
            },
            description
          ),
        ]
      : []),
    footer(h('div', { style: { fontFamily: hand, fontSize: 28, color: C.moss } }, dateText)),
  ]);

  return toPng(tree, cjk);
}

const SITE_TAGLINE_ZH = '机器学习研究、Swift，还有偶尔掉进去的 debug 兔子洞。';
const SITE_TAGLINE_EN = 'Machine learning research, Swift, and the occasional debugging rabbit hole.';

export async function renderSiteOg(): Promise<Buffer> {
  const cjk = await wenkaiFor(SITE_TAGLINE_ZH);
  const tree = frame([
    h('div', { style: { display: 'flex', fontFamily: 'Young Serif', fontSize: 88, lineHeight: 1.1, color: C.text } }, 'konakona'),
    h('div', { style: { display: 'flex', marginTop: 16 } }, squiggle(290)),
    h('div', { style: { display: 'flex', marginTop: 34, fontFamily: stack(cjk, 'Literata'), fontSize: 34, color: C.muted } }, SITE_TAGLINE_ZH),
    h('div', { style: { display: 'flex', marginTop: 12, fontFamily: 'Literata', fontSize: 29, color: C.muted } }, SITE_TAGLINE_EN),
    footer(null),
  ]);
  return toPng(tree, cjk);
}

export function pngResponse(png: Buffer): Response {
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
