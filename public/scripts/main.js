// Language auto-detection
(function() {
  try {
    const getCookie = (name) => {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : '';
    };
    
    if (!getCookie('lang')) {
      const nav = (navigator.language || '').toLowerCase();
      document.cookie = 'lang=' + (nav.startsWith('en') ? 'en' : 'zh-CN') + '; path=/; max-age=31536000';
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
