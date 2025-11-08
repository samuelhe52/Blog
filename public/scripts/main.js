// Language auto-detection and redirect
(function() {
  try {
    const getCookie = (name) => {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : '';
    };
    
    const currentPath = window.location.pathname;
    const isEnglishPage = currentPath.startsWith('/en');
    const isHomePage = currentPath === '/' || currentPath === '/en' || currentPath === '/en/';
    
    // Only auto-detect and redirect on first visit to homepage
    if (isHomePage && !getCookie('lang')) {
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      const preferEnglish = browserLang.startsWith('en');
      
      // Set cookie based on browser preference
      const detectedLang = preferEnglish ? 'en' : 'zh-CN';
      document.cookie = 'lang=' + detectedLang + '; path=/; max-age=31536000';
      
      // Redirect if needed
      if (preferEnglish && !isEnglishPage) {
        window.location.replace('/en/');
      } else if (!preferEnglish && isEnglishPage) {
        window.location.replace('/');
      }
    }
  } catch(e) {}
})();

// Staggered fade-in animation
document.addEventListener('DOMContentLoaded', () => {
  const animateElements = document.querySelectorAll('.animate');
  animateElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('show');
    }, index * 100);
  });
});
