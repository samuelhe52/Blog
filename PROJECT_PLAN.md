# Project Plan
Timestamp: 2025-11-07T17:10:58.559Z

## Phase 0: Repo & Init
- Initialize git repo and Astro project (nano theme).
- Add @astrojs/i18n.
- Commit DECISIONS.md, AGENTS.md, PROJECT_PLAN.md.

## Phase 1: Core Structure
- Create directories: src/content/posts/{zh,en}/.
- Add sample posts with frontmatter (title, date, lang, translationSlug, description).
- Implement translation pairing utility.

## Phase 2: Layout & Metadata
- Build Layout.astro: html lang, canonical, hreflang, meta description, OG/Twitter tags.
- Utility for building hreflang set (only existing translations).
- Global CSS minimal typography.

## Phase 3: Language Switching
- LanguageSwitcher component: reads cookie, sets cookie, disables missing translation target.
- First-visit detection (Accept-Language) fallback to zh if unknown.

## Phase 4: Dynamic OG Images
- Implement endpoint (e.g. /og/[slug].png) using @vercel/og-like or satori (if chosen) or fallback static SVG to PNG.
- Cache output during build.

## Phase 5: Sitemap
- Build script to output sitemap.xml with both locale URLs.
- Include <xhtml:link> alternates for bilingual pages.

## Phase 6: Deployment Pipeline
- GitHub Actions: install deps, astro build, rsync dist/ to VM via SSH.
- Secrets: SSH_HOST, SSH_USER, SSH_KEY.
- Optional: integrity check (hash manifest) before sync.

## Phase 7: Nginx & TLS
- Provide server block config: trailing slash rewrite, gzip/static file headers, security headers (Content-Security-Policy minimal, X-Frame-Options, etc.).
- Document certbot steps.

## Phase 8: Polish & Docs
- README: setup, deploy, adding translation posts workflow.
- Document future tasks (search, typed i18n).

## Future (Deferred)
- Search: choose indexing (Lunr/Fuse vs external service). Per-language index generation script.
- Typed i18n migration.
- Additional locales.

## Milestones & Acceptance
- MVP deployed: bilingual post loads, switcher works, sitemap valid, OG image renders.
- Performance: Lighthouse ≥ 90 performance & accessibility.

## Risks & Mitigations
- Missing translation: show original, disable switch target.
- OG image generation complexity: start with static template, upgrade later.
- i18n config drift: enforce via single source of truth in astro.config.

## Tracking
Updates appended with date below.

### Updates
(None yet)
