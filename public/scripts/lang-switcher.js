// Language switcher
(function() {
  const zh = document.getElementById('to-zh');
  const en = document.getElementById('to-en');
  
  function switchLanguage(url) {
    // Fade out animation before navigation
    const animateElements = document.querySelectorAll('.animate');
    animateElements.forEach((element) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(-12px)';
    });
    
    // Navigate after animation
    setTimeout(() => {
      location.href = url;
    }, 200);
  }
  
  if (zh && !zh.disabled) {
    zh.addEventListener('click', () => {
      document.cookie = 'lang=zh-CN; path=/; max-age=31536000';
      switchLanguage(zh.getAttribute('data-target'));
    });
  }
  
  if (en && !en.disabled) {
    en.addEventListener('click', () => {
      document.cookie = 'lang=en; path=/; max-age=31536000';
      switchLanguage(en.getAttribute('data-target'));
    });
  }
})();
