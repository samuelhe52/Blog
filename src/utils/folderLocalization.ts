/**
 * Folder name localization mapping
 * Maps English folder names to their Chinese equivalents
 */

export interface FolderLocalization {
  en: string;
  zh: string;
}

export const FOLDER_NAMES: Record<string, FolderLocalization> = {
  'tutorial': {
    en: 'tutorial',
    zh: '教程'
  },
  'tutorial/advanced': {
    en: 'advanced',
    zh: '高级'
  },
  // Add more folder mappings here as needed
  // 'projects': {
  //   en: 'projects',
  //   zh: '项目'
  // },
};

/**
 * Get localized folder name for display
 */
export function getLocalizedFolderName(folderPath: string, lang: 'zh-CN' | 'en'): string {
  const mapping = FOLDER_NAMES[folderPath];
  if (!mapping) {
    // Return the last segment of the path as fallback
    return folderPath.split('/').pop() || folderPath;
  }
  
  return lang === 'zh-CN' ? mapping.zh : mapping.en;
}

/**
 * Get the canonical folder path (always use English names as keys)
 * This ensures both language versions point to the same logical folder
 */
export function getCanonicalFolderPath(displayName: string, parentPath: string = ''): string {
  // Search for the folder with this display name
  const fullPath = parentPath ? `${parentPath}/${displayName}` : displayName;
  
  // Check if there's a mapping for this path
  if (FOLDER_NAMES[fullPath]) {
    return fullPath;
  }
  
  // Check if displayName matches any zh or en value
  for (const [path, localization] of Object.entries(FOLDER_NAMES)) {
    if (path.endsWith(`/${displayName}`) || path === displayName) {
      if (localization.en === displayName || localization.zh === displayName) {
        return path;
      }
    }
  }
  
  // Default: return as-is
  return fullPath;
}
