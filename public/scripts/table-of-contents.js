const TOC_RING_LENGTH = 2 * Math.PI * 22.5;
let progressTarget = null;
let progressFrame = 0;
let progressListening = false;

function updateProgress() {
  progressFrame = 0;
  if (!progressTarget) {
    return;
  }

  const { article, headings, links, ring } = progressTarget;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  const threshold = atBottom ? window.innerHeight : 120;
  const current = headings.filter((heading) => heading.getBoundingClientRect().top <= threshold).pop();
  const currentHash = current ? `#${current.id}` : '';
  links.forEach((link) => {
    link.classList.toggle('active', link.hash === currentHash);
  });

  if (ring) {
    const rect = article.getBoundingClientRect();
    const distance = rect.height - window.innerHeight;
    const progress = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 1;
    ring.style.strokeDashoffset = String(TOC_RING_LENGTH * (1 - progress));
  }
}

function scheduleProgress() {
  if (!progressFrame) {
    progressFrame = window.requestAnimationFrame(updateProgress);
  }
}

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

  const openDialog = (event) => {
    dialog.classList.remove('is-closing');
    dialog.showModal();

    const nav = dialog.querySelector('.toc-dialog-nav');
    const current = dialogList.querySelector('.toc-link.active') || dialogList.querySelector('.toc-link');
    if (nav && current) {
      nav.scrollTop = current.offsetTop - nav.offsetTop - (nav.clientHeight - current.offsetHeight) / 2;
      // Keyboard opens (click with detail 0) land on the current entry; pointer
      // opens focus the list itself so no focus ring is drawn.
      const openedByKeyboard = event?.detail === 0;
      (openedByKeyboard ? current : nav).focus({ preventScroll: true });
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
      const goToHeading = () => {
        history.pushState(null, '', `#${id}`);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      };

      if (isDialog) {
        closeDialog(goToHeading);
      } else {
        goToHeading();
      }
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

  progressTarget = {
    article,
    headings,
    links: [...document.querySelectorAll('.toc-link')],
    ring: toggle.querySelector('.toc-progress-value')
  };
  updateProgress();
  if (!progressListening) {
    window.addEventListener('scroll', scheduleProgress, { passive: true });
    window.addEventListener('resize', scheduleProgress, { passive: true });
    progressListening = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', generateTOC, { once: true });
} else {
  generateTOC();
}

document.addEventListener('astro:page-load', generateTOC);
