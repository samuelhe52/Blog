# Folder Organization Guide

## Overview

Posts can now be organized into hierarchical folders within the `/zh` and `/en` content directories. The UI automatically displays:
1. **Posts section**: Direct children (posts not in subfolders)
2. **Folders section**: Subfolders as navigable cards

## Folder Structure

### Directory Layout
```
src/content/posts/
├── zh/
│   ├── post1.md              # Root level post (Chinese)
│   ├── post2.md              # Root level post (Chinese)
│   └── tutorial/             # Folder
│       ├── basics.md         # Post in folder
│       └── advanced/         # Nested folder
│           └── tips.md       # Post in nested folder
└── en/
    ├── post1.md              # Root level post (English)
    ├── post2.md              # Root level post (English)
    └── tutorial/             # Folder
        ├── basics.md         # Post in folder
        └── advanced/         # Nested folder
            └── tips.md       # Post in nested folder
```

## How It Works

### Automatic Path Detection
- The system automatically detects folder structure from file paths
- No frontmatter changes needed - just organize files in folders
- Folder names are extracted from the file path

### URL Structure
- **Root posts**: `/posts/{slug}/` or `/en/posts/{slug}/`
- **Folder view**: `/folders/{path}/` or `/en/folders/{path}/`
- **Example**: 
  - Post at `zh/tutorial/basics.md` → accessible at `/posts/basics/`
  - Folder view: `/folders/tutorial/` shows all posts in tutorial folder

### Hierarchical Navigation
- **Homepage** (`/` or `/en/`): Shows root posts + first-level folders
- **Folder page** (`/folders/tutorial/`): Shows posts in tutorial + subfolders
- **Breadcrumbs**: Automatically generated for navigation

## UI Components

### FolderView Component
Displays the two-section layout:
1. Posts directly under current folder
2. Subfolders as navigable cards

Features:
- Folder cards show post count
- Hover animations
- Responsive design
- Folder icon (📁)

### Breadcrumbs Component
Shows navigation path:
- Home → Folder1 → Folder2 → Current
- Links to all parent folders
- Only shown when inside folders (not on homepage)

## Creating Folders

### Step 1: Create Directory
```bash
mkdir -p src/content/posts/zh/my-folder
mkdir -p src/content/posts/en/my-folder
```

### Step 2: Add Posts
Create markdown files in the folder:
```markdown
---
title: "My Post Title"
description: "Post description"
date: 2025-11-15
lang: "zh-CN"
translationSlug: "my-post"
author: "konakona"
---

Content here...
```

### Step 3: Build
The system automatically:
- Detects the folder structure
- Creates folder pages
- Updates navigation

## Translation Pairing

- Posts with same `translationSlug` are paired across languages
- Folder structure should match between `/zh/` and `/en/` for consistency
- Example:
  ```
  zh/tutorial/basics.md (translationSlug: "astro-basics")
  en/tutorial/basics.md (translationSlug: "astro-basics")
  ```

## Styling

### Custom Folder Icons
To change folder icons, edit `FolderView.astro`:
```astro
<div class="folder-icon">📁</div>  <!-- Change this -->
```

### Theme Support
- Folder cards adapt to light/dark mode via CSS variables
- Border colors: `var(--border)`
- Hover colors: `var(--link)`
- Background: `var(--bg-secondary)`

## Technical Details

### Utility Functions (`src/utils/folders.ts`)
- `extractFolderPath()`: Get folder path from entry ID
- `getImmediateSubfolder()`: Find direct child folders
- `isDirectChild()`: Check if post is in current folder
- `buildFolderStructure()`: Build complete folder structure
- `getAllFolderPaths()`: Get all unique folder paths for routing

### Routing
- Dynamic routes: `[...folder].astro` handles all folder depths
- Static generation: Paths generated at build time from content
- Language-specific: Separate routes for `/folders/` and `/en/folders/`

## Migration

### From Flat to Hierarchical
1. Move posts into folders
2. No frontmatter changes needed
3. Rebuild site
4. Old URLs still work (post URLs based on `translationSlug`, not path)

### Example Migration
```bash
# Before
src/content/posts/zh/tutorial-part-1.md
src/content/posts/zh/tutorial-part-2.md

# After
mkdir src/content/posts/zh/tutorial
mv src/content/posts/zh/tutorial-part-1.md src/content/posts/zh/tutorial/
mv src/content/posts/zh/tutorial-part-2.md src/content/posts/zh/tutorial/
```

## Best Practices

1. **Consistent Structure**: Keep `/zh/` and `/en/` folder structures identical
2. **Folder Naming**: Use lowercase, hyphens for spaces (e.g., `my-folder`)
3. **Depth Limit**: Avoid excessive nesting (2-3 levels recommended)
4. **Empty Folders**: Folders only appear in UI if they contain posts
5. **Translation Slugs**: Keep unique across all folders

## Future Enhancements

Potential additions:
- Folder metadata (description, icon, order)
- Folder-level frontmatter files
- Tag/category system alongside folders
- Search within folders
- Folder RSS feeds
