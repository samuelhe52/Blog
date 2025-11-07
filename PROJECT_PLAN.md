# Project Plan
Timestamp: 2025-11-07T17:10:58.559Z
Updated: 2025-11-07T19:58:00.000Z

## IMPORTANT: Theme Decision
**We are NOT using the Astro Nano npm package.**
- Reason: Dependency complexity, patch-package issues, hard to integrate with bilingual setup.
- Approach: Custom minimal theme INSPIRED by Nano's features and aesthetics.
- Goal: Achieve feature parity with Nano (see NANO_PARITY.md) while maintaining clean bilingual-first architecture.

## Phase 0: Repo & Init ✅ COMPLETE
- ✅ Initialize git repo and Astro project (custom minimal theme).
- ✅ Commit DECISIONS.md, AGENTS.md, PROJECT_PLAN.md.

## Phase 1: Core Structure ✅ COMPLETE
- ✅ Create directories: src/content/posts/{zh,en}/.
- ✅ Add sample posts with frontmatter (title, date, lang, translationSlug, description).
- ✅ Translation pairing via translationSlug.

## Phase 2: Layout & Metadata ✅ COMPLETE
- ✅ Build Layout.astro: html lang, canonical, hreflang, meta description, OG/Twitter tags.
- ✅ Hreflang only for existing translations.
- ✅ Custom CSS with CSS variables for light/dark mode.
- ✅ Clean minimal typography.

## Phase 3: Language Switching ✅ COMPLETE
- ✅ LanguageSwitcher component: reads/sets cookie, disables missing translation target.
- ✅ First-visit auto-detection (Accept-Language) fallback to zh-CN.
- ✅ MissingTranslationNotice component.

## Phase 4: Dynamic OG Images ⏳ DEFERRED
- Status: Deferred to post-MVP (dependency complexity).
- Plan: Simple static fallback for now, add dynamic generation later.

## Phase 5: Sitemap ✅ COMPLETE
- ✅ sitemap.xml with both locale URLs.
- ✅ Hreflang alternates for bilingual pages.

## Phase 6: Deployment Pipeline ✅ COMPLETE
- ✅ GitHub Actions: install deps, astro build, rsync dist/ to VM via SSH.
- ✅ Secrets: SSH_HOST, SSH_USER, SSH_KEY configured.

## Phase 7: Nginx & TLS ✅ COMPLETE
- ✅ Server block config with trailing slash rewrite.
- ✅ TLS via Let's Encrypt documented.

## Phase 8: Polish & Docs ⏳ IN PROGRESS
- ⏳ README: setup, deploy, adding translation posts workflow.
- ✅ NANO_PARITY.md: feature checklist vs Astro Nano.
- ⏳ Document future tasks (search, typed i18n).

## Next Phases (Post-MVP)

### Phase 9: Lighthouse Optimization
- Run audit, fix performance/accessibility issues.
- Target: 90+ on all metrics.
- Optimize images, fonts, critical CSS.

### Phase 10: MDX Support
- Add @astrojs/mdx integration.
- Test with sample component-rich posts.

### Phase 11: Styling Polish
- Consider Tailwind integration for utility classes.
- Improve typography with @tailwindcss/typography or custom.
- Refine responsive design.

### Phase 12: Dynamic OG Images
- Implement per-post OG image generation.
- Test with Chinese & English titles.

### Phase 13: UI Enhancements
- Reading time estimates.
- Back to top button.
- Subtle animations (fade-in on scroll).
- Table of contents for long posts.

### Phase 14: RSS Feed (Deferred)
- Implement RSS generation per language (/rss.xml for zh, /en/rss.xml for en).
- Use @astrojs/rss package.

## Future (Deferred)
- Search: choose indexing (Lunr/Fuse vs external service). Per-language index generation script.
- Typed i18n migration (typesafe-i18n or TS modules).
- Additional locales (if needed).
- Comments system (giscus/utterances).

## Milestones & Acceptance
- ✅ MVP deployed: bilingual post loads, switcher works, sitemap valid.
- ⏳ Nano parity: RSS, MDX, Lighthouse 90+, OG images.
- ⏳ Performance: Lighthouse ≥ 90 performance & accessibility.

## Risks & Mitigations
- Missing translation: ✅ show original, disable switch target.
- OG image generation complexity: ⏳ deferred to post-MVP.
- Dependency conflicts: ✅ avoided by using custom theme instead of Nano package.

## Tracking
Updates appended with date below.

### Updates
- 2025-11-07T19:58:00Z: Decided on custom theme approach instead of Astro Nano package. Created NANO_PARITY.md checklist. Updated phases to reflect completed work and new priorities.
