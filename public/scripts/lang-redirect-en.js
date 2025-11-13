// Redirect to Chinese if user explicitly chose Chinese (English page only)
(function() {
  // Only run on /en/ path
  if (window.location.pathname !== '/en/') return;
  
  // Check if user has explicitly chosen Chinese
  const langCookie = document.cookie.split('; ').find(row => row.startsWith('lang='));
  
  if (langCookie) {
    const lang = langCookie.split('=')[1];
    if (lang === 'zh-CN') {
      window.location.href = '/';
    }
  }
})();
