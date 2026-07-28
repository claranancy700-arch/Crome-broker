// Utility JS for site: sets year, smooth scrolling, scroll spy, reveal on scroll.

(function () {
  'use strict';

  // Set copyright year
  function setYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  // Smooth scroll for internal anchors
  function enableSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (href === '#' || href === '#!') return;
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // update URL without jumping
        history.pushState(null, '', href);
      });
    });
  }

  // Scroll spy to highlight nav links
  function enableScrollSpy() {
    const navLinks = Array.from(document.querySelectorAll('.main-nav a'));
    const sections = navLinks
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    if (!sections.length) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        let activeIndex = 0;
        const mid = window.innerHeight / 2;
        sections.forEach((sec, i) => {
          const rect = sec.getBoundingClientRect();
          if (rect.top <= mid && rect.bottom >= mid) activeIndex = i;
        });
        navLinks.forEach((link, i) =>
          link.classList.toggle('active', i === activeIndex)
        );
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal elements when they enter the viewport (IntersectionObserver)
  function enableRevealOnScroll() {
    const items = document.querySelectorAll('.feature, .card, .hero');
    if (!items.length || !('IntersectionObserver' in window)) {
      // fallback: show all
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.12 }
    );

    items.forEach((el) => io.observe(el));
  }

  // Initialize everything (nav shell is handled by nav.js)
  function init() {
    setYear();
    enableSmoothScroll();
    enableScrollSpy();
    enableRevealOnScroll();
  }

  // Run init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();