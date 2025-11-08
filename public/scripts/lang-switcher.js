// Language switcher
(function() {
  const zh = document.getElementById('to-zh');
  const en = document.getElementById('to-en');
  
  if (zh && !zh.disabled) {
    zh.addEventListener('click', () => {
      document.cookie = 'lang=zh-CN; path=/; max-age=31536000';
      location.href = zh.getAttribute('data-target');
    });
  }
  
  if (en && !en.disabled) {
    en.addEventListener('click', () => {
      document.cookie = 'lang=en; path=/; max-age=31536000';
      location.href = en.getAttribute('data-target');
    });
  }
})();
