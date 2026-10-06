const CJK = /[㐀-䶿一-鿿豈-﫿]/g;

export function calculateReadingTime(content: string): number {
  // Roughly 200 English words or 400 CJK characters per minute
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*`>_|-]/g, ' ');

  const cjkChars = cleanContent.match(CJK)?.length ?? 0;
  const words = cleanContent.replace(CJK, ' ').split(/\s+/).filter((w) => /\w/.test(w)).length;

  return Math.max(1, Math.round(words / 200 + cjkChars / 400));
}

export function formatReadingTime(minutes: number, lang: 'zh-CN' | 'en'): string {
  if (lang === 'zh-CN') {
    return `${minutes} 分钟阅读`;
  }
  return `${minutes} min read`;
}
