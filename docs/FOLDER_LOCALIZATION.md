# Folder Localization Guide

## Overview

Folder names are localized using a centralized mapping file (`src/utils/folderLocalization.ts`) that maps English folder paths to their Chinese equivalents.

## How It Works

### Configuration File

The `FOLDER_NAMES` object in `src/utils/folderLocalization.ts` maps folder paths to localized names:

```typescript
export const FOLDER_NAMES: Record<string, FolderLocalization> = {
  tutorial: {
    en: "tutorial",
    zh: "教程",
  },
  "tutorial/advanced": {
    en: "advanced",
    zh: "高级",
  },
};
```

### Key Principles

1. **English paths as keys**: The file system uses English folder names (`tutorial`, `advanced`)
2. **Full path mapping**: Use the complete path from the language root for nested folders
3. **Display-only localization**: Folder names in URLs remain in English; only the UI shows translated names

## Adding New Folders

### Step 1: Create Folder (English name)

```bash
mkdir -p src/content/posts/zh/projects
mkdir -p src/content/posts/en/projects
```

### Step 2: Add Localization Mapping

Edit `src/utils/folderLocalization.ts`:

```typescript
export const FOLDER_NAMES: Record<string, FolderLocalization> = {
  tutorial: {
    en: "tutorial",
    zh: "教程",
  },
  "tutorial/advanced": {
    en: "advanced",
    zh: "高级",
  },
  projects: {
    // ← Add this
    en: "projects",
    zh: "项目",
  },
};
```

### Step 3: Add Posts

Create posts in both language folders using the same English folder structure.

## Nested Folders

For nested folders, use the full path as the key:

```typescript
export const FOLDER_NAMES: Record<string, FolderLocalization> = {
  tutorial: {
    en: "tutorial",
    zh: "教程",
  },
  "tutorial/advanced": {
    // Full path
    en: "advanced",
    zh: "高级",
  },
  "tutorial/advanced/patterns": {
    // Even deeper nesting
    en: "patterns",
    zh: "设计模式",
  },
};
```

## Where Localization Appears

Localized folder names appear in:

1. **Homepage folder cards**: Shows "教程" instead of "tutorial"
2. **Folder page titles**: `<h1>教程</h1>`
3. **Breadcrumbs**: "首页 / 教程 / 高级"
4. **Browser title**: "教程 - konakona"
5. **Folder list items**: Subfolder names within parent folders

## URL Structure

**Important**: URLs always use English folder names, regardless of localization:

- Chinese: `/folders/tutorial/` (not `/folders/教程/`)
- English: `/en/folders/tutorial/`

This ensures:

- Clean, predictable URLs
- No encoding issues
- Easy linking between languages

## Example Configuration

Complete example for a tutorial series with projects:

```typescript
export const FOLDER_NAMES: Record<string, FolderLocalization> = {
  // Tutorials
  tutorial: {
    en: "tutorial",
    zh: "教程",
  },
  "tutorial/basics": {
    en: "basics",
    zh: "基础",
  },
  "tutorial/advanced": {
    en: "advanced",
    zh: "高级",
  },

  // Projects
  projects: {
    en: "projects",
    zh: "项目",
  },
  "projects/web": {
    en: "web",
    zh: "网页开发",
  },
  "projects/mobile": {
    en: "mobile",
    zh: "移动开发",
  },

  // Blog
  blog: {
    en: "blog",
    zh: "博客",
  },
  "blog/tech": {
    en: "tech",
    zh: "技术",
  },
  "blog/life": {
    en: "life",
    zh: "生活",
  },
};
```

## Fallback Behavior

If a folder is not in the mapping:

- The last segment of the path is used as the display name
- Example: `notes/2025/january` → displays "january"

To ensure proper localization, **always add folders to the mapping**.

## Best Practices

1. **Consistent naming**: Use lowercase, hyphenated English names in the file system
2. **Complete paths**: Map every folder, including nested ones
3. **Short translations**: Keep Chinese names concise (2-4 characters ideal)
4. **Alphabetical order**: Organize mappings by path alphabetically for maintainability
5. **Comment sections**: Group related folders with comments

## Migration

If you have existing folders without localization:

1. They will still work (using English names as fallback)
2. Add them to `FOLDER_NAMES` to localize
3. No URL changes needed - existing links remain valid

## Technical Details

### Functions

- `getLocalizedFolderName(path, lang)`: Get display name for a folder
- `getCanonicalFolderPath(displayName, parentPath)`: Convert display name back to path (future use)

### Usage in Components

```astro
---
import { getLocalizedFolderName } from '../utils/folderLocalization';

const folderPath = 'tutorial/advanced';
const displayName = getLocalizedFolderName(folderPath, 'zh-CN'); // "高级"
---

<h1>{displayName}</h1>
```

## Troubleshooting

### Folder name shows in English on Chinese site

**Cause**: Folder not in `FOLDER_NAMES` mapping

**Fix**: Add mapping to `src/utils/folderLocalization.ts`

### Nested folder not localizing

**Cause**: Only parent folder mapped, not the full path

**Fix**: Add mapping for complete path, e.g., `tutorial/advanced` not just `advanced`

### Breadcrumbs show mixed languages

**Cause**: Some folders in path are mapped, others aren't

**Fix**: Map all folders in the hierarchy
