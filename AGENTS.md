# Agents Guide
Timestamp: 2025-11-07T17:10:58.559Z

## Purpose
This file tells any assisting agent (automation, AI, scripts) EXACTLY how to approach this bilingual Astro blog project.

## High-Level Vision
Minimalist, performant bilingual (Chinese default, English secondary) static blog using Astro + Nano; clean SEO, translation pairing, dynamic OG images; future-friendly (search, typed i18n later).

## Author Preferences
- Explanations: patient, plain language; avoid heavy jargon unless clarified.
- Implementation: clear directory structure, small focused components, minimal client JS.
- Internationalization: use @astrojs/i18n; Chinese default (no prefix), English under /en/.
- URL style: enforce trailing slashes.
- OG images: per-post dynamic generation; site-level image non-localized.
- UI strings: start with JSON (/src/i18n/{zh,en}.json); may migrate to typed TS later.
- Language switcher: global (site-wide preference), always visible; disable target if translation missing.
- Persistence: cookie stores chosen language; initial auto-detect from browser.
- SEO: self-canonical per page; hreflang only for existing translations (zh-CN, en).

## Author Info
- Site title: konakona's Lodge
- Author: konakona (Samuel He)
- Contact: samuelhe52@outlook.com

## Core Decisions
(Consolidated from DECISIONS.md as of 2025-11-07T17:14:47.107Z)
- Default locale: Chinese (no /zh prefix). English under /en/.
- translationSlug identical across languages (English string).
- Fallback: show available language; switcher always visible; disable target if missing translation.
- Sitemap: single combined; RSS deferred.
- Language switcher: site-wide language preference via cookie; auto-detect on first visit.
- Locale codes: hreflang zh-CN & en; og:locale zh_CN default, en_US alternate.
- OG images: per-post dynamic; site image not localized.
- Canonicals: self per page; hreflang only for existing translations.
- Deployment: custom VM with Nginx + Let's Encrypt.
- CI/CD: GitHub Actions automated build & rsync deploy.
- URL style: trailing slash enforced.
- Domain: blog.konakona52.com root (no base path).
- UI strings: JSON for now; may migrate to TS later.
- Search: planned later (multilingual); defer in MVP.

## Current Deliverables (MVP)
- Astro + Nano initialized.
- @astrojs/i18n configured (zh-CN default, en secondary) with trailing slash.
- Content dirs: src/content/posts/{zh,en}/.
- translationSlug in frontmatter to pair posts.
- Layout: html lang, canonical, hreflang, meta description, OG/Twitter tags.
- Dynamic OG image endpoint (/og/[slug].png) with title + branding.
- Language switcher (cookie + detection) disabling missing translation target.
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
