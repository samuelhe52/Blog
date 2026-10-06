// Staggered fade-in animation
document.addEventListener('DOMContentLoaded', () => {
  const animateElements = document.querySelectorAll('.animate');
  animateElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('show');
    }, index * 100);
  });
});
