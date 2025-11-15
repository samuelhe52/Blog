import type { CollectionEntry } from 'astro:content';

export interface PostItem {
  slug: string;
  title: string;
  description?: string;
  date: Date;
  path: string;
}

export interface FolderItem {
  name: string;
  path: string;
  postCount: number;
}

export interface FolderStructure {
  posts: PostItem[];
  folders: FolderItem[];
}

/**
 * Extract folder path from collection entry ID
 * e.g., "zh/tutorial/basics.md" -> "tutorial"
 * e.g., "en/dev/projects/myproject.md" -> "dev/projects"
 */
export function extractFolderPath(id: string, lang: 'zh' | 'en'): string {
  const prefix = `${lang}/`;
  if (!id.startsWith(prefix)) return '';
  
  const withoutLang = id.slice(prefix.length);
  const parts = withoutLang.split('/');
  
  if (parts.length <= 1) return '';
  
  return parts.slice(0, -1).join('/');
}

/**
 * Get immediate subfolder name from a path relative to current folder
 * e.g., currentPath="", itemPath="dev/projects" -> "dev"
 * e.g., currentPath="dev", itemPath="dev/projects" -> "projects"
 * e.g., currentPath="dev", itemPath="tutorial" -> null (not a child)
 */
export function getImmediateSubfolder(currentPath: string, itemPath: string): string | null {
  const current = currentPath ? currentPath + '/' : '';
  
  if (!itemPath.startsWith(current)) return null;
  
  const remainder = itemPath.slice(current.length);
  const parts = remainder.split('/');
  
  return parts[0] || null;
}

/**
 * Check if a post is directly under the current folder (not in a subfolder)
 */
export function isDirectChild(currentPath: string, itemPath: string): boolean {
  return currentPath === itemPath;
}

/**
 * Build folder structure for a given folder path
 * Only counts direct descendant posts (not recursive)
 */
export function buildFolderStructure(
  entries: CollectionEntry<'posts'>[],
  currentFolderPath: string = ''
): FolderStructure {
  const posts: PostItem[] = [];
  const folderMap = new Map<string, number>();
  
  for (const entry of entries) {
    const lang = entry.data.lang === 'zh-CN' ? 'zh' : 'en';
    const folderPath = extractFolderPath(entry.id, lang);
    
    if (isDirectChild(currentFolderPath, folderPath)) {
      posts.push({
        slug: entry.data.translationSlug,
        title: entry.data.title,
        description: entry.data.description,
        date: entry.data.date,
        path: folderPath
      });
    }
    
    const subfolder = getImmediateSubfolder(currentFolderPath, folderPath);
    if (subfolder) {
      const subfolderPath = currentFolderPath ? `${currentFolderPath}/${subfolder}` : subfolder;
      const subfolderPostPath = extractFolderPath(entry.id, lang);
      
      // Only count if this post is a direct child of the subfolder
      if (subfolderPostPath.startsWith(subfolderPath)) {
        const relativeToSubfolder = subfolderPostPath.slice(subfolderPath.length);
        // Direct child means no more slashes after removing subfolder path
        if (relativeToSubfolder === '' || !relativeToSubfolder.slice(1).includes('/')) {
          folderMap.set(subfolderPath, (folderMap.get(subfolderPath) || 0) + 1);
        }
      }
    }
  }
  
  const folders: FolderItem[] = Array.from(folderMap.entries()).map(([path, count]) => ({
    name: path.split('/').pop() || path,
    path,
    postCount: count
  }));
  
  posts.sort((a, b) => b.date.getTime() - a.date.getTime());
  folders.sort((a, b) => a.name.localeCompare(b.name));
  
  return { posts, folders };
}

/**
 * Get all unique folder paths for a language
 */
export function getAllFolderPaths(entries: CollectionEntry<'posts'>[], lang: 'zh-CN' | 'en'): string[] {
  const paths = new Set<string>();
  const langCode = lang === 'zh-CN' ? 'zh' : 'en';
  
  for (const entry of entries) {
    if (entry.data.lang !== lang) continue;
    const folderPath = extractFolderPath(entry.id, langCode);
    if (folderPath) {
      const parts = folderPath.split('/');
      for (let i = 1; i <= parts.length; i++) {
        paths.add(parts.slice(0, i).join('/'));
      }
    }
  }
  
  return Array.from(paths).sort();
}
