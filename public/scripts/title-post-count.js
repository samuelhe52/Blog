document.querySelectorAll('[data-post-count]').forEach((button) => {
  if (button.dataset.countInitialized) return;
  button.dataset.countInitialized = 'true';
  let clickedOpen = false;

  const setExpanded = (expanded) => {
    if (!expanded) clickedOpen = false;
    button.setAttribute('aria-expanded', String(expanded));
  };

  button.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') setExpanded(true);
  });

  button.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') setExpanded(false);
  });

  button.addEventListener('click', () => {
    clickedOpen = !clickedOpen;
    setExpanded(clickedOpen);
  });

  button.addEventListener('blur', () => setExpanded(false));

  document.addEventListener('click', (event) => {
    if (!button.parentElement.contains(event.target)) setExpanded(false);
  });

  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setExpanded(false);
  });
});
