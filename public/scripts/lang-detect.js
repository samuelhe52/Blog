// Auto-detect browser language on first visit (root page only)
(function() {
  const path = window.location.pathname;
  const isChineseLanding = path === '/' || path === '/zh/' || path === '/zh';

  // Only run on the Chinese landing route (root currently redirects to /zh/)
  if (!isChineseLanding) return;

  const redirectToEnglish = () => {
    window.location.href = '/en/';
  };

  // Check if user has a language preference cookie
  const langCookie = document.cookie.split('; ').find(row => row.startsWith('lang='));

  if (!langCookie) {
    // No preference set - detect from browser
    const browserLang = navigator.language || navigator.userLanguage || '';
    const primaryLang = browserLang.split('-')[0].toLowerCase();

    // If browser prefers English, redirect to /en/
    if (primaryLang === 'en') {
      redirectToEnglish();
    }
    // Otherwise stay on Chinese (default - no action needed)
  } else {
    // User has a preference - respect it
    const lang = langCookie.split('=')[1];
    if (lang === 'en') {
      redirectToEnglish();
    }
    // If lang === 'zh-CN', stay on root (no action needed)
  }
})();
