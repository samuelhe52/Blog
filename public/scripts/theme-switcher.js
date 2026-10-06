// Theme switcher
function setTheme(theme) {
  const lightBtn = document.getElementById('theme-light');
  const darkBtn = document.getElementById('theme-dark');
  const autoBtn = document.getElementById('theme-auto');
  
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    theme = 'auto';
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('theme', theme);

  [['light', lightBtn], ['dark', darkBtn], ['auto', autoBtn]].forEach(([name, button]) => {
    button?.classList.toggle('active', name === theme);
    button?.setAttribute('aria-pressed', String(name === theme));
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  setTheme(savedTheme || 'auto');
}

document.getElementById('theme-light')?.addEventListener('click', () => setTheme('light'));
document.getElementById('theme-dark')?.addEventListener('click', () => setTheme('dark'));
document.getElementById('theme-auto')?.addEventListener('click', () => setTheme('auto'));

initTheme();
