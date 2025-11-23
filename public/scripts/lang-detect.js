// Redirect root visitors based purely on browser language.
(function() {
  const path = window.location.pathname;
  if (path !== '/' && path !== '/index.html') return;

  const preference = () => {
    const languages = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    for (const raw of languages) {
      const lang = (raw || '').trim().toLowerCase();
      if (!lang) continue;
      if (lang.startsWith('zh')) return '/zh/';
      if (lang.startsWith('en')) return '/en/';
    }
    return '/en/';
  };

  const target = preference();
  if (target && target !== path) {
    window.location.replace(target);
  }
})();
