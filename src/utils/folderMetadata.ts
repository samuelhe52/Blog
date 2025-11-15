import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface FolderMetadata {
  slug: string;
  name: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
}

export interface FoldersConfig {
  folders: FolderMetadata[];
}

let cachedConfig: FoldersConfig | null = null;

/**
 * Load folder metadata from YAML file
 */
export function loadFolderMetadata(): FoldersConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), 'src/content/folders.yaml');
  
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    cachedConfig = yaml.load(fileContents) as FoldersConfig;
    return cachedConfig;
  } catch (error) {
    console.warn('Failed to load folders.yaml, using empty config:', error);
    return { folders: [] };
  }
}

/**
 * Get folder metadata by slug
 */
export function getFolderMetadata(slug: string): FolderMetadata | undefined {
  const config = loadFolderMetadata();
  return config.folders.find(f => f.slug === slug);
}

/**
 * Get localized folder name
 */
export function getLocalizedFolderName(folderPath: string, lang: 'zh-CN' | 'en'): string {
  const metadata = getFolderMetadata(folderPath);
  
  if (!metadata) {
    // Fallback: return the last segment of the path, capitalized
    const lastSegment = folderPath.split('/').pop() || folderPath;
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return lang === 'zh-CN' ? metadata.name.zh : metadata.name.en;
}

/**
 * Get localized folder description
 */
export function getLocalizedFolderDescription(folderPath: string, lang: 'zh-CN' | 'en'): string | undefined {
  const metadata = getFolderMetadata(folderPath);
  
  if (!metadata) {
    return undefined;
  }
  
  return lang === 'zh-CN' ? metadata.description.zh : metadata.description.en;
}

/**
 * Get all folder metadata
 */
export function getAllFolderMetadata(): FolderMetadata[] {
  const config = loadFolderMetadata();
  return config.folders;
}
