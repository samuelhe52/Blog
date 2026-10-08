# Agents Guide

## Purpose

This file describes the decisions and conventions for working on this bilingual Astro blog.

## High-Level Vision

Minimalist, performant bilingual (Chinese default, English secondary) static blog using Astro with a custom theme; clean SEO, translation pairing, dynamic OG images; future-friendly (search, typed i18n later).

## Author Preferences

- Explanations: patient, plain language; avoid heavy jargon unless clarified.
- Implementation: clear directory structure, small focused components, minimal client JS.
- Internationalization: Chinese default under /zh/, English under /en/.
- URL style: enforce trailing slashes.
- OG images: per-post dynamic generation; site-level image non-localized.
- UI strings: start with JSON (/src/i18n/{zh,en}.json); may migrate to typed TS later.
- Language switcher: always visible; disable target if translation missing.
- Language detection: instant redirect at root (/) based on browser language; English fallback for unsupported locales.
- SEO: self-canonical per page; hreflang only for existing translations (zh-CN, en).
- Dependencies: Keep minimal, avoid complex tooling unless necessary.

## Author Info

- Site title: konakona
- Author: konakona (Samuel He)
- Contact: <samuelhe52@outlook.com>

## Core Decisions

- **Theme approach**: Custom minimal theme, not the Astro Nano package, to avoid its dependency complexity.
- Default locale: Chinese, served under /zh/. English under /en/. Unprefixed /posts/* redirects to /en/posts/*.
- translationSlug identical across languages (English string).
- Fallback: show available language; switcher always visible; disable target if missing translation.
- Sitemap: single combined sitemap with hreflang alternates.
- RSS: separate feeds per language (/rss.xml for zh, /en/rss.xml for en).
- Language detection: instant redirect at root (/) via inline script; checks browser languages for zh/en, defaults to English for unsupported locales.
- Locale codes: hreflang zh-CN & en; og:locale zh_CN default, en_US alternate.
- OG images: generated per post at build time (satori + resvg) under /og/.
- Canonicals: self per page; hreflang only for existing translations.
- Deployment: custom VM with Nginx + Let's Encrypt.
- CI/CD: GitHub Actions automated build & rsync deploy.
- URL style: trailing slash enforced.
- Domains: blog.konakona.dev serves this build and is the canonical URL; blog.konakona52.com and konakona52.com redirect to it. konakona.dev is the separate personal profile site (samuelhe52/profile), which 301-redirects the blog's old root-domain paths (/en/, /posts/, /zh/posts/, /folders/, /og/, /images/, /lab/, /scripts/, /rss.xml) to blog.konakona.dev. Don't link to blog content on the bare konakona.dev domain.
- UI strings: JSON for now; may migrate to TS later.
- Search: planned later (multilingual).
- Styling: Custom CSS with CSS variables (not Tailwind yet, may add later for utilities).

## Implemented

- Content collections in src/content/posts/{zh,en}/, paired by translationSlug; nested folders with metadata in src/content/folders.yaml.
- Layout with html lang, canonical, hreflang, meta description, OG/Twitter tags.
- Language switcher with disabled states; MissingTranslationNotice.
- Combined sitemap with hreflang alternates; per-language RSS; robots.txt.
- MDX, KaTeX math, Shiki code highlighting (light/dark).
- Per-post dynamic OG images.
- Reading time, table of contents with reading progress, older/newer post navigation, back-to-top, code copy.
- Light/dark theme via CSS variables; bilingual 404 page.
- GitHub Actions build and rsync deploy.
- Slides section: decks are static HTML under public/slides/<deck>/{en,zh}/ with a cover image of the first slide; src/data/slides.ts lists them; /zh/slides/ and /en/slides/ show cards; /slides/ redirects by browser language (LanguageRedirect component, shared with the root page); the home pages show the latest decks as compact cards between Posts and Folders (SlidesSection in the FolderView before-folders slot); deck figures are WebP.

## Deferred

- Search (multilingual index strategy).
- Typed i18n (typesafe-i18n or TS modules).
- Advanced OG image styling variants.

## Implementation Principles for Agents

1. Respect consolidated decisions above; never change without explicit user instruction.
2. Keep changes minimal and incremental; avoid large refactors without need.
3. Prefer build-time solutions (static generation over client JS).
4. Degrade gracefully when translation absent.
5. Accessibility: proper lang attributes, alt text, readable contrast.
6. Security: no secrets committed; deployment uses SSH keys in CI secrets.
7. **Theme transitions**: All components must include CSS transitions for color, background, and border-color changes (0.3s ease-in-out) to prevent flashing when theme switches via in-page buttons. Match pattern in Layout.astro.
8. **Scripts**: Keep JavaScript in external files under /public/scripts/. The exceptions are scripts that must run before the page renders (the theme script in Layout.astro, and LanguageRedirect.astro for the root page and /slides/) and the standalone decks in public/slides/. The production CSP (infra/nginx/blog.conf) allows scripts only from the site itself, cdnjs.cloudflare.com, and static.cloudflareinsights.com, so self-host anything else; decks load KaTeX from /slides/_vendor/katex/ (copied from node_modules/katex/dist; see its VERSION file).
9. Work on `main` directly unless explicitly told otherwise; don't create feature branches.

## File Structure Guidelines

- src/i18n/: en.json, zh.json for UI strings.
- src/site.config.ts: site title, author, domain, locales.
- src/layouts/Layout.astro: central metadata + language logic.
- src/components/LanguageSwitcher.astro: links to the other locale + disabled state.
- src/pages/index.astro: root language redirect; src/pages/zh/index.astro and src/pages/en/index.astro are the home pages.
- src/pages/{zh,en}/posts/[...translationSlug].astro for posts; src/pages/posts/ only redirects to English.
- src/pages/folders/ (zh) and src/pages/en/folders/ for folder views.
- src/pages/og/ for OG images; src/utils/ for folder, OG, reading-time, and post-link helpers.
- public/scripts/: client JavaScript (see the scripts rule for exceptions).
- infra/nginx/: mirror of the production Nginx config on serJP, including the CSP; keep it in sync when the server config changes.
- docs/: how-to guides; docs/archive/ holds superseded plans and notes.

## Communication Style

When asking for clarification: list concise numbered questions.
When presenting code: minimize extraneous comments; only clarify non-obvious logic.

## Reference Plan

The original phase plan is archived at docs/archive/PROJECT_PLAN.md.

## Updating This File

Keep this file current: when a decision or fact changes, edit it in place. Git history records past decisions.
