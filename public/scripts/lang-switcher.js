// Language switcher
(function() {
  const zh = document.getElementById('to-zh');
  const en = document.getElementById('to-en');
  
  if (zh && !zh.disabled) {
    zh.addEventListener('click', () => {
      // Save scroll position
      sessionStorage.setItem('scrollPosition', window.scrollY.toString());
      document.cookie = 'lang=zh-CN; path=/; max-age=31536000';
      location.href = zh.getAttribute('data-target');
    });
  }
  
  if (en && !en.disabled) {
    en.addEventListener('click', () => {
      // Save scroll position
      sessionStorage.setItem('scrollPosition', window.scrollY.toString());
      document.cookie = 'lang=en; path=/; max-age=31536000';
      location.href = en.getAttribute('data-target');
    });
  }
  
  // Restore scroll position after page load
  const savedPosition = sessionStorage.getItem('scrollPosition');
  if (savedPosition) {
    window.scrollTo(0, parseInt(savedPosition, 10));
    sessionStorage.removeItem('scrollPosition');
  }
})();
