# konakona

Source for [blog.konakona.dev](https://blog.konakona.dev), a bilingual (Chinese / English) personal blog built with [Astro](https://astro.build).

## Features

- Chinese and English versions of each post, paired by a shared `translationSlug`. The language switcher greys out a language when a post has no translation.
- Language redirect at `/` based on browser language (`/zh/` or `/en/`).
- Posts can be grouped into nested folders, with localized folder names.
- Markdown and MDX, KaTeX math, and Shiki code highlighting with light and dark themes.
- Build-time OG images for every post (satori + resvg).
- Per-language RSS feeds, a sitemap with `hreflang` alternates, canonical URLs.
- Table of contents with reading progress, reading time, older/newer post links.
- Light and dark themes. No UI framework; client scripts are small files in `public/scripts/`.

## Running locally

Requires Node.js 24 (the version CI uses).

```sh
npm install
npm run dev       # dev server at http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve dist/
```

## Writing a post

Posts live in `src/content/posts/zh/` and `src/content/posts/en/`:

```md
---
title: "Principal Component Analysis, Explained Intuitively"
description: "One-sentence summary used for SEO and post lists."
date: 2026-01-09
lang: "en" # "zh-CN" or "en"
translationSlug: "pca-intuitive"
author: "konakona"
draft: false # optional; drafts are not built
---

Body starts at `##`. The layout renders the title as the H1.
```

- To pair a translation, give both files the same `translationSlug`. The URLs become `/zh/posts/<translationSlug>/` and `/en/posts/<translationSlug>/`.
- To put a post in a folder, place it in a subdirectory (for example `en/cs50-ai-notes/`) and start the `translationSlug` with that folder path. Folder display names and descriptions go in `src/content/folders.yaml`. See [docs/FOLDER_MANAGEMENT.md](docs/FOLDER_MANAGEMENT.md).
- Put images next to the post or in `public/images/`.

## Project layout

```
src/
  content/posts/{zh,en}/   posts
  content/folders.yaml     folder names and descriptions
  data/slides.ts           slide deck list shown at /zh/slides/ and /en/slides/
  pages/                   routes (zh/, en/, folders/, og/, rss.xml)
  components/, layouts/    UI
  i18n/{zh,en}.json        UI strings
  site.config.ts           site title, author, domain
public/
  scripts/                 client JavaScript (kept out of HTML for CSP)
  images/, lab/            post images and interactive pages
  slides/<deck>/           standalone HTML slide decks ({en,zh}/index.html, cover-*.webp)
  slides/_vendor/katex/    self-hosted KaTeX for the decks (the CSP blocks CDN scripts)
infra/nginx/               reference Nginx config
docs/                      guides; docs/archive/ holds old plans
```

`AGENTS.md` records the design decisions and conventions for anyone (or any coding agent) changing the site.

## Deployment

Each push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow builds the site and rsyncs `dist/` to a VM running Nginx with Let's Encrypt. It needs these repository secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_REMOTE_PATH`.

## License

The code is licensed under [MIT](LICENSE-CODE). Posts, post images, the pages in `public/lab/`, and the slide decks in `public/slides/` are licensed under [CC BY 4.0](LICENSE-CONTENT); figures reproduced from papers keep their authors' copyright. [LICENSE](LICENSE) lists which files fall under each license.
