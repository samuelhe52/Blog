let tocObserver;

function generateTOC() {
  const article = document.querySelector('article .prose');
  const desktopList = document.getElementById('toc-list');
  const dialogList = document.getElementById('toc-dialog-list');
  const dialog = document.getElementById('toc-dialog');
  const toggle = document.getElementById('toc-toggle');
  const close = document.getElementById('toc-close');
  const tocElements = [
    document.querySelector('.toc-desktop'),
    toggle
  ].filter(Boolean);

  if (!article || !desktopList || !dialogList || !dialog || !toggle || !close) {
    return;
  }

  const headings = [...article.querySelectorAll('h2, h3')];

  if (headings.length === 0) {
    tocElements.forEach((element) => {
      element.hidden = true;
    });
    return;
  }

  tocElements.forEach((element) => {
    element.hidden = false;
  });
  desktopList.replaceChildren();
  dialogList.replaceChildren();

  const closeDialog = (afterClose) => {
    if (!dialog.open || dialog.classList.contains('is-closing')) {
      return;
    }

    let closeFallback;
    const finishClose = () => {
      dialog.removeEventListener('animationend', handleAnimationEnd);
      window.clearTimeout(closeFallback);
      dialog.classList.remove('is-closing');
      dialog.close();
      afterClose?.();
    };
    const handleAnimationEnd = (event) => {
      if (
        event.target === dialog &&
        (event.animationName === 'tocDrawerOut' || event.animationName === 'tocSheetOut')
      ) {
        finishClose();
      }
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      afterClose?.();
      return;
    }

    dialog.classList.add('is-closing');
    dialog.addEventListener('animationend', handleAnimationEnd);
    closeFallback = window.setTimeout(finishClose, 260);
  };

  const openDialog = () => {
    dialog.classList.remove('is-closing');
    dialog.showModal();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const createItem = (heading, index, isDialog) => {
    const level = heading.tagName.toLowerCase();
    const text = heading.textContent || '';
    const id = heading.id || text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');

    if (!heading.id) {
      heading.id = id;
    }

    const item = document.createElement('li');
    item.className = `toc-item toc-${level}`;

    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = text;
    link.className = 'toc-link';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      history.pushState(null, '', `#${id}`);
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    item.appendChild(link);
    item.style.setProperty('--toc-delay', `${index * (isDialog ? 18 : 40)}ms`);
    return item;
  };

  headings.forEach((heading, index) => {
    desktopList.appendChild(createItem(heading, index, false));
    dialogList.appendChild(createItem(heading, index, true));
  });

  if (!toggle.dataset.tocReady) {
    const wideLayout = window.matchMedia('(min-width: 1200.01px)');

    toggle.addEventListener('click', openDialog);
    close.addEventListener('click', () => closeDialog());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        closeDialog();
      }
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog();
    });
    wideLayout.addEventListener('change', (event) => {
      if (event.matches && dialog.open) {
        closeDialog();
      }
    });
    toggle.dataset.tocReady = 'true';
  }

  tocObserver?.disconnect();
  tocObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      document.querySelectorAll('.toc-link').forEach((link) => {
        link.classList.toggle('active', link.hash === `#${entry.target.id}`);
      });
    });
  }, {
    rootMargin: '-100px 0px -66%',
    threshold: 0
  });

  headings.forEach((heading) => tocObserver.observe(heading));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', generateTOC, { once: true });
} else {
  generateTOC();
}

document.addEventListener('astro:page-load', generateTOC);
