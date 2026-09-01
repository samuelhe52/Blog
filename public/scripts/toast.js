(function() {
  let hideTimer;

  function handleToast(event) {
    const detail = typeof event.detail === 'string'
      ? { message: event.detail }
      : event.detail || {};
    const message = String(detail.message || '').trim();
    const duration = Number.isFinite(detail.duration)
      ? Math.min(Math.max(detail.duration, 500), 10_000)
      : 1600;
    const toast = document.querySelector('[data-site-toast]');

    if (!message || !toast) {
      return;
    }

    window.clearTimeout(hideTimer);
    toast.textContent = message;
    toast.classList.remove('is-visible');

    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    hideTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, duration);
  }

  window.addEventListener('site:toast', handleToast);
})();
