(function() {
  if (window.__sshCopyBound) {
    return;
  }
  window.__sshCopyBound = true;

  function showToast(message, duration) {
    window.dispatchEvent(new CustomEvent('site:toast', {
      detail: { message, duration }
    }));
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('.ssh-copy');
    if (!button) {
      return;
    }

    const command = button.dataset.sshCommand || '';
    try {
      await navigator.clipboard.writeText(command);
      showToast(`${button.dataset.copiedLabel || 'Copied'}: ${command}`, 3000);
    } catch (_) {
      // Clipboard blocked: still show the command so it can be typed by hand.
      showToast(command, 6000);
    }
  });
})();
