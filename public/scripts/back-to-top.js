// Back to top button
(function() {
  const button = document.getElementById('back-to-top');
  const tocToggle = document.getElementById('toc-toggle');
  
  if (button) {
    const updateVisibility = () => {
      const isVisible = window.scrollY > 300;
      button.classList.toggle('visible', isVisible);
      tocToggle?.classList.toggle('back-to-top-visible', isVisible);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    
    // Scroll to top on click
    button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
})();
