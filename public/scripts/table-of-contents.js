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
