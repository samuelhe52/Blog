(function() {
  function getLabels() {
    return {
      copy: document.body.dataset.copyLabel || 'Copy',
      copied: document.body.dataset.copiedLabel || 'Copied',
      failed: document.body.dataset.copyFailedLabel || 'Copy failed'
    };
  }

  function fallbackCopy(text) {
    const activeElement = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (_) {
      copied = false;
    }

    textarea.remove();
    activeElement?.focus?.({ preventScroll: true });
    return copied;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        // Fall back for browsers that block the async clipboard API.
      }
    }

    return fallbackCopy(text);
  }

  function showToast(message) {
    window.dispatchEvent(new CustomEvent('site:toast', {
      detail: { message }
    }));
  }

  function copyIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>';
    return svg;
  }

  function enhanceCodeBlocks(prose, labels) {
    prose.querySelectorAll('pre').forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-block')) {
        return;
      }

      const code = pre.querySelector('code');
      if (!code) {
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      pre.before(wrapper);

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const language = document.createElement('span');
      language.className = 'code-block-language';
      language.textContent = pre.dataset.language || 'text';
      header.appendChild(language);

      wrapper.appendChild(pre);

      const button = document.createElement('button');
      button.className = 'code-block-copy';
      button.type = 'button';
      button.setAttribute('aria-label', labels.copy);
      button.appendChild(copyIcon());

      const buttonLabel = document.createElement('span');
      buttonLabel.textContent = labels.copy;
      button.appendChild(buttonLabel);
      header.appendChild(button);
      wrapper.prepend(header);

      button.addEventListener('click', async () => {
        const copied = await copyText(code.textContent || '');
        showToast(copied ? labels.copied : labels.failed);

        if (copied) {
          buttonLabel.textContent = labels.copied;
          button.setAttribute('aria-label', labels.copied);
          window.setTimeout(() => {
            buttonLabel.textContent = labels.copy;
            button.setAttribute('aria-label', labels.copy);
          }, 1600);
        }
      });
    });
  }

  function enhanceInlineCode(prose, labels) {
    prose.querySelectorAll('code').forEach((code) => {
      if (code.closest('pre, a, button') || code.dataset.copyableInline) {
        return;
      }

      const text = code.textContent || '';
      const description = text.length > 80 ? `${text.slice(0, 77)}...` : text;
      code.dataset.copyableInline = 'true';
      code.tabIndex = 0;
      code.setAttribute('role', 'button');
      code.setAttribute('aria-label', `${labels.copy}: ${description}`);
      code.title = labels.copy;

      const copyInline = async () => {
        if (!window.getSelection()?.isCollapsed) {
          return;
        }

        const copied = await copyText(text);
        showToast(copied ? labels.copied : labels.failed);
      };

      code.addEventListener('click', copyInline);
      code.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        copyInline();
      });
    });
  }

  function initializeCodeCopy() {
    const labels = getLabels();
    document.querySelectorAll('article .prose').forEach((prose) => {
      enhanceCodeBlocks(prose, labels);
      enhanceInlineCode(prose, labels);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCodeCopy, { once: true });
  } else {
    initializeCodeCopy();
  }

  document.addEventListener('astro:page-load', initializeCodeCopy);
})();
