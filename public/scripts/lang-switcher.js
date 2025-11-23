// Language switcher
(function() {
  const zh = document.getElementById('to-zh');
  const en = document.getElementById('to-en');
  
  if (zh && !zh.disabled) {
    zh.addEventListener('click', () => {
      location.href = zh.getAttribute('data-target');
    });
  }
  
  if (en && !en.disabled) {
    en.addEventListener('click', () => {
      location.href = en.getAttribute('data-target');
    });
  }
})();
