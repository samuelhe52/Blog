// Theme switcher
function setTheme(theme) {
  localStorage.setItem('theme', theme);
  
  // Create a class-based approach for disabling transitions
  document.documentElement.classList.add('theme-transitioning');
  
  const lightBtn = document.getElementById('theme-light');
  const darkBtn = document.getElementById('theme-dark');
  const autoBtn = document.getElementById('theme-auto');
  
  lightBtn?.classList.remove('active');
  darkBtn?.classList.remove('active');
  autoBtn?.classList.remove('active');
  
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    lightBtn?.classList.add('active');
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    darkBtn?.classList.add('active');
  } else {
    document.documentElement.removeAttribute('data-theme');
    autoBtn?.classList.add('active');
  }
  
  // Remove the class after the browser has painted
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('theme-transitioning');
    });
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
