# AI Prompt: Normalize Markdown to Blog Post Format

Use this prompt verbatim with an AI agent to convert one or more Markdown files into the blog's standard post format. Keep to required fields only.

## Blog Rules (for the AI)

- Frontmatter schema (required): `title` (string), `description` (string), `date` (`YYYY-MM-DD`), `lang` (`zh-CN` or `en`), `translationSlug` (English slug, can include folder segments), `author` (string). Do not add other fields unless they already exist and are required by the user. Prefer deriving `date` from the original file's creation timestamp when available; otherwise leave `YYYY-MM-DD` and request a value.
- Frontmatter must be wrapped in `---` delimiters and followed by a single blank line before content begins.
- File placement: `src/content/posts/zh/` for default locale, `src/content/posts/en/` for English. Keep any folder path segments inside the filename and reuse them in `translationSlug` (e.g., `missing-semester-notes/shell` stays the same in both locales).
- Translation pairing: matching `translationSlug` binds zh/en versions. Do not invent a counterpart language file.
- Headings: The layout renders the H1. Remove any in-body top-level H1 and start content at `##`.
- URLs: trailing slashes are enforced by the site; `translationSlug` feeds the permalink. Default locale has no `/zh` prefix; English is under `/en/`.

## Conversion Steps (the AI should follow)

1. Copy the source markdown into the workspace first, then read it from there (preserve original untouched).
2. Extract a suitable `title` (prefer the existing H1 text; otherwise derive from filename). Strip that H1 from the body.
3. Set `date` to the provided value if present; otherwise request or leave a clear placeholder `YYYY-MM-DD`.
4. Set `lang` to `zh-CN` or `en` based on the target file location or user instruction.
5. Set `translationSlug` in English, using the filename/folder path (kebab-case). Preserve any folder nesting segments.
6. Reconstruct the file with YAML frontmatter containing only the required fields in this order: `title`, `description`, `date`, `lang`, `translationSlug`, `author`.
7. Body starts immediately after frontmatter. All sections should begin at `##` or lower; keep relative heading hierarchy.
8. Output the full transformed markdown ready to save at the correct path under `src/content/posts/{lang}/`.

### Example header (realistic)

```markdown
---
title: "Lecture 2: Uncertainty"
description: "CS50 AI lecture notes on probabilistic reasoning, Bayes' rule, Bayesian networks, and HMMs."
date: 2025-12-05
lang: "en"
translationSlug: "cs50-ai-notes/2-uncertainty"
author: "konakona"
---

## Overview
...
```
