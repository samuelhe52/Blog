function generateTOC() {
  const article = document.querySelector('article .prose');
  const tocList = document.getElementById('toc-list');
  
  if (!article || !tocList) {
    console.log('TOC: Missing article or tocList', { article, tocList });
    return;
  }

  const headings = article.querySelectorAll('h2, h3');
  console.log('TOC: Found headings:', headings.length);
  
  if (headings.length === 0) {
    const toc = document.querySelector('.toc');
    if (toc) toc.style.display = 'none';
    return;
  }

  // Clear existing items (for page transitions)
  tocList.innerHTML = '';

  const fragment = document.createDocumentFragment();
  
  headings.forEach((heading) => {
    const level = heading.tagName.toLowerCase();
    const text = heading.textContent || '';
    const id = heading.id || text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
    
    if (!heading.id) {
      heading.id = id;
    }

    const li = document.createElement('li');
    li.className = `toc-item toc-${level}`;
    
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = text;
    a.className = 'toc-link';
    
    // Add smooth scroll on click
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const headerHeight = 80; // Approximate header height with padding
      const elementPosition = heading.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      history.pushState(null, '', `#${id}`);
    });
    
    li.appendChild(a);
    fragment.appendChild(li);
  });

  tocList.appendChild(fragment);
  // Stagger animate items
  [...tocList.children].forEach((li,i)=>{
    li.style.opacity='0';
    li.style.animation='tocItemFade 0.3s ease-out forwards';
    li.style.animationDelay=(i*40)+'ms';
  });
  console.log('TOC: Items added:', tocList.children.length);

  // Highlight active section on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.id;
      const link = tocList.querySelector(`a[href="#${id}"]`);
      
      if (entry.isIntersecting) {
        tocList.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
        link?.classList.add('active');
      }
    });
  }, {
    rootMargin: '-100px 0px -66%',
    threshold: 0
  });

  headings.forEach((heading) => observer.observe(heading));
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', generateTOC);
} else {
  generateTOC();
}

// Re-run on view transitions
document.addEventListener('astro:page-load', generateTOC);

// Responsive overlay / FAB behavior
(function initTocOverlay(){
  const toc = document.querySelector('.toc');
  const fab = document.querySelector('.toc-fab');
  const backdrop = document.querySelector('.toc-backdrop');
  const closeBtn = document.querySelector('.toc-close');
  if (!toc || !fab || !backdrop || !closeBtn) return;
  const OPEN_CLASS = 'open';
  function open() {
    toc.classList.add(OPEN_CLASS);
    backdrop.classList.add(OPEN_CLASS);
    fab.setAttribute('aria-expanded','true');
    // Prevent body scroll
    document.documentElement.style.overflow='hidden';
  }
  function close() {
    toc.classList.remove(OPEN_CLASS);
    backdrop.classList.remove(OPEN_CLASS);
    fab.setAttribute('aria-expanded','false');
    document.documentElement.style.overflow='';
  }
  fab.addEventListener('click', ()=>{
    if (toc.classList.contains(OPEN_CLASS)) { close(); } else { open(); }
  });
  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  // Close on ESC
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });
  function handleResize(){
    if (window.innerWidth >= 1200) {
      // Ensure overlay classes cleared & scrolling restored
      close();
    }
  }
  window.addEventListener('resize', handleResize);
  handleResize();
})();
