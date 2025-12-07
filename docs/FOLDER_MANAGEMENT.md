# Folder Management Guide

## Overview

This blog uses a YAML-based folder configuration system for managing folder metadata. This makes it easy to add new folders, provide translations, and maintain descriptions without touching TypeScript code.

## Configuration File

Location: `src/content/folders.yaml`

## How to Add a New Folder

### Step 1: Create the folder structure

Create your posts in the appropriate language folders:
```
src/content/posts/
  zh/
    your-folder-name/
      post-1.md
      post-2.md
  en/
    your-folder-name/
      post-1.md
      post-2.md
```

### Step 2: Add metadata to folders.yaml

Open `src/content/folders.yaml` and add an entry:

```yaml
- slug: "your-folder-name"
  name:
    zh: "文件夹的中文名称"
    en: "Folder Name in English"
  description:
    zh: "这个文件夹的中文描述，会显示在文件夹页面上"
    en: "Description of this folder in English, shown on the folder page"
```

### Step 3: That's it!

The build system will automatically:
- Generate folder pages for both languages
- Show the correct name and description based on language
- Handle translation fallbacks if posts only exist in one language

## Folder Metadata Structure

### Required Fields

- **slug**: The folder path used in URLs (must match your actual folder structure)
  - Example: `"missing-semester-notes"` or `"projects/web-dev"`
  - Must match the folder name in `src/content/posts/zh/` and `src/content/posts/en/`

- **name**: Display names for both languages
  - **zh**: Chinese display name
  - **en**: English display name

- **description**: Folder overviews for both languages
  - **zh**: Chinese description (shown on folder page and in meta tags)
  - **en**: English description (shown on folder page and in meta tags)

## Example: Complete Entry

```yaml
- slug: "web-development"
  name:
    zh: "Web 开发"
    en: "Web Development"
  description:
    zh: "关于现代 Web 开发技术的文章集合，包括前端框架、后端架构和最佳实践"
    en: "Collection of articles about modern web development technologies, including frontend frameworks, backend architecture, and best practices"
```

## Nested Folders

For nested folders (folders within folders), use forward slashes in the slug:

```yaml
- slug: "tutorials/beginner"
  name:
    zh: "初学者教程"
    en: "Beginner Tutorials"
  description:
    zh: "适合初学者的编程教程"
    en: "Programming tutorials for beginners"

- slug: "tutorials/advanced"
  name:
    zh: "高级教程"
    en: "Advanced Tutorials"
  description:
    zh: "面向高级开发者的深度技术文章"
    en: "In-depth technical articles for advanced developers"
```

## What Happens If You Don't Add Metadata?

If you create a folder but don't add it to `folders.yaml`, the system will:
- Use the folder slug as the display name (with basic capitalization)
- Not show any description
- Still work, but won't look as polished

## Translation Fallback Behavior

### Folder with Posts in Both Languages
- Chinese site shows Chinese posts
- English site shows English posts
- No fallback notice

### Folder with Posts in One Language Only
- Both language sites will show the available content
- A notice appears: "此内容暂无中文翻译" (Chinese) or "This content is not yet available in English"
- User can click to view in the original language

## Best Practices

1. **Keep slugs simple**: Use lowercase, hyphens for spaces (e.g., `web-development`)
2. **Match folder structure**: Ensure slug exactly matches your folder name
3. **Write clear descriptions**: Help readers understand what content they'll find
4. **Be consistent**: Keep similar description lengths across folders
5. **Use proper encoding**: YAML supports UTF-8, so Chinese characters work perfectly

## Maintenance

To update folder metadata:
1. Edit `src/content/folders.yaml`
2. Run `npm run build` or `npm run dev`
3. Changes apply immediately (no code changes needed!)

## Troubleshooting

### Folder not showing correct name
- Check that `slug` matches your actual folder path exactly
- Verify YAML syntax (proper indentation, colons, quotes)

### Description not appearing
- Ensure both `zh` and `en` descriptions are provided
- Check for YAML syntax errors

### Build errors
- Validate YAML syntax using an online YAML validator
- Check for special characters that need escaping
- Ensure proper indentation (use spaces, not tabs)
