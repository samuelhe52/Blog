// Back to top button
(function() {
  const button = document.getElementById('back-to-top');
  
  if (button) {
    // Show button when scrolled down
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        button.classList.add('visible');
      } else {
        button.classList.remove('visible');
      }
    });
    
    // Scroll to top on click
    button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
})();
