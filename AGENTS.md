# Agents Guide

Timestamp: 2025-11-07T19:58:00.000Z

## Purpose

This file tells any assisting agent (automation, AI, scripts) EXACTLY how to approach this bilingual Astro blog project.

## High-Level Vision

Minimalist, performant bilingual (Chinese default, English secondary) static blog using Astro with custom minimal theme inspired by Astro Nano; clean SEO, translation pairing, dynamic OG images; future-friendly (search, typed i18n later).

## Author Preferences

- Explanations: patient, plain language; avoid heavy jargon unless clarified.
- Implementation: clear directory structure, small focused components, minimal client JS.
- Internationalization: Chinese default (no prefix), English under /en/.
- URL style: enforce trailing slashes.
- OG images: per-post dynamic generation; site-level image non-localized.
- UI strings: start with JSON (/src/i18n/{zh,en}.json); may migrate to typed TS later.
- Language switcher: global (site-wide preference), always visible; disable target if translation missing.
- Language detection: instant redirect at root (/) based on browser language; English fallback for unsupported locales.
- SEO: self-canonical per page; hreflang only for existing translations (zh-CN, en).
- Dependencies: Keep minimal, avoid complex tooling unless necessary.

## Author Info

- Site title: konakona
- Author: konakona (Samuel He)
- Contact: <samuelhe52@outlook.com>

## Core Decisions

(Updated 2025-11-07T19:58:00.000Z)

- **Theme approach**: Custom minimal theme (NOT using Astro Nano package due to dependency complexity). Goal is feature parity with Nano while maintaining bilingual-first design. See NANO_PARITY.md for checklist.
- Default locale: Chinese (no /zh prefix). English under /en/.
- translationSlug identical across languages (English string).
- Fallback: show available language; switcher always visible; disable target if missing translation.
- Sitemap: single combined sitemap with hreflang alternates.
- RSS: Planned - separate feeds per language.
- Language detection: instant redirect at root (/) via inline script; checks browser languages for zh/en, defaults to English for unsupported locales.
- Locale codes: hreflang zh-CN & en; og:locale zh_CN default, en_US alternate.
- OG images: Planned dynamic generation per-post.
- Canonicals: self per page; hreflang only for existing translations.
- Deployment: custom VM with Nginx + Let's Encrypt.
- CI/CD: GitHub Actions automated build & rsync deploy.
- URL style: trailing slash enforced.
- Domain: blog.konakona52.com root (no base path).
- UI strings: JSON for now; may migrate to TS later.
- Search: planned later (multilingual); defer in MVP.
- Styling: Custom CSS with CSS variables (not Tailwind yet, may add later for utilities).

## Current Deliverables (MVP Complete)

- ✅ Astro initialized with bilingual structure.
- ✅ Content collections: src/content/posts/{zh,en}/.
- ✅ translationSlug in frontmatter to pair posts.
- ✅ Layout: html lang, canonical, hreflang, meta description, OG/Twitter tags.
- ✅ Language switcher (cookie + detection) with disabled states for missing translations.
- ✅ MissingTranslationNotice component.
- ✅ Combined sitemap with hreflang alternates.
- ✅ Header, PostList, PostHeader components.
- ✅ Light/dark mode support via CSS variables.
- ✅ Minimal responsive design.
- ✅ GitHub Actions deployment workflow.
- ✅ robots.txt.

## Next Priorities (See NANO_PARITY.md)

1. Lighthouse audit & optimization
2. MDX support for rich content
3. Better styling/polish
4. Dynamic OG images
5. UX enhancements (reading time, animations)
6. RSS Feed (deferred)

- Combined sitemap (both locales; alternates only when translation exists).
- GitHub Actions workflow (build & rsync deploy to Nginx VM with TLS).

## Non-MVP (Deferred)

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
8. **No inline scripts**: Server has CSP restrictions. All JavaScript must be in external files in /public/scripts/ directory. **Exception**: The root index.astro uses an inline script for instant language redirect (runs before body renders).

## File Structure Guidelines

- src/i18n/: en.json, zh.json for UI strings.
- src/layouts/Layout.astro: central metadata + language logic.
- src/components/LanguageSwitcher.{astro|tsx}: cookie logic + disabled state.
- src/pages/index.astro (zh default), src/pages/en/index.astro.
- src/pages/en/posts/[slug]/ and src/pages/posts/[slug]/ for posts.
- scripts/ or lib/ for sitemap and OG generation utilities.

## Agent Action Checklist (MVP Setup)

1. Create Astro project & install dependencies (@astrojs/i18n).
2. Scaffold content directories & sample bilingual post pair with translationSlug.
3. Implement Layout with canonical + hreflang + OG tags.
4. Add language switcher component (cookie + disable if missing counterpart).
5. Implement dynamic OG image route.
6. Generate combined sitemap at build.
7. Add GitHub Actions workflow (.github/workflows/deploy.yml).
8. Provide Nginx server block example (not auto-applied here).

## Communication Style

When asking for clarification: list concise numbered questions.
When presenting code: minimize extraneous comments; only clarify non-obvious logic.

## Reference Plan

Project phases detailed in PROJECT_PLAN.md (kept separately for task sequencing).

## Updating This File

Append new sections under "Updates" with timestamps. Do not erase historical decisions.
