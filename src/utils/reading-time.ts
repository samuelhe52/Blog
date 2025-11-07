export function calculateReadingTime(content: string): number {
  // Average reading speed: 200 words per minute
  const wordsPerMinute = 200;
  
  // Remove code blocks and HTML tags for more accurate count
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[#*`]/g, '');
  
  // Count words (split by whitespace)
  const words = cleanContent.trim().split(/\s+/).length;
  
  // Calculate reading time in minutes, minimum 1 minute
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function formatReadingTime(minutes: number, lang: 'zh-CN' | 'en'): string {
  if (lang === 'zh-CN') {
    return `${minutes} 分钟阅读`;
  }
  return `${minutes} min read`;
}
