// This deferred script runs after parsing, without waiting for analytics.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.animate').forEach((element, index) => {
    element.animate(
      [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 600, delay: index * 100, easing: 'ease-out', fill: 'backwards' },
    );
  });
}
