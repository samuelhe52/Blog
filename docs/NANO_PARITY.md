# Nano Feature Parity Checklist
Updated: 2025-11-07T19:57:00Z

## Astro Nano Claims (from README)
- ✅ 100/100 Lighthouse performance
- ✅ Responsive
- ✅ Accessible
- ✅ SEO-friendly
- ✅ Typesafe
- ✅ Minimal style
- ✅ Light/Dark Theme
- ⚠️  Animated UI
- ⚠️  Tailwind styling
- ✅ Auto generated sitemap
- ❌ Auto generated RSS Feed
- ✅ Markdown support
- ❌ MDX Support (components in markdown)

## Our Current Status

### ✅ Implemented
1. **Bilingual support** (zh-CN default, English /en/)
2. **SEO-friendly** - canonical, hreflang, meta description, OG tags
3. **Sitemap** - Combined bilingual with alternates
4. **Responsive** - Mobile-first CSS
5. **Accessible** - Proper lang attributes, semantic HTML
6. **Light/Dark theme** - CSS variables with prefers-color-scheme
7. **Minimal style** - Clean typography, ~40rem max-width
8. **Typesafe** - TypeScript, Astro content collections
9. **Language switcher** - Cookie-based preference, disabled states
10. **Missing translation notice** component
11. **Post listing** with dates & descriptions
12. **Markdown support** - Built-in Astro
13. **MDX Support** - Components in markdown (Astro v5 + @astrojs/mdx)
14. **Dynamic OG images** - SVG generation per post at build time
15. **Reading time** - Calculated word count with bilingual labels
16. **Back to top button** - Smooth scroll with fade-in/out
17. **Page animations** - Subtle fade-in on load
18. **RSS Feeds** - Separate feeds per language (/rss.xml, /en/rss.xml)

### ❌ Missing (Need to Add)
1. **RSS Feed** - Auto-generated per language
2. **MDX Support** - For components in markdown
3. **Tailwind** - Optional, but gives us utilities
4. **Animations** - Fade-in on scroll, transitions
5. **100/100 Lighthouse** - Need to test & optimize
6. **Typography plugin** - Better prose styling
7. **Back to top** button
8. **Reading time** estimate
9. **Draft posts** support (already in schema, need UI)
10. **OG images** - Dynamic generation per post

## Priority Order (MVP+)
1. ✅ Lighthouse audit & fixes (100/100/96/100 - Excellent!)
2. ✅ MDX support (DONE - Astro v5 + @astrojs/mdx)
3. ~~Better styling/polish~~ (Deferred - current CSS is clean and works well)
4. ✅ OG images (DONE - SVG generation at build time)
5. ✅ UX enhancements (DONE - reading time, back-to-top, animations)
6. ✅ RSS Feed (DONE - Separate feeds per language)

## Implementation Notes
- Keep bilingual as first priority
- Don't break existing translation switching
- Maintain minimal dependencies
- Test build after each feature
- Update AGENTS.md with decisions
