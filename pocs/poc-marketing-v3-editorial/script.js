/* =============================================================
   Redirect Manager — Award Editorial
   Custom cursor (lerp), kinetic letter reveals, scroll IntersectionObserver
   reveals, hover word-break shifts, page-transition overlay.
   Respects prefers-reduced-motion.
   ============================================================= */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* -------------------------------------------------------
     1. CUSTOM CURSOR with lerp lag
     ------------------------------------------------------- */
  if (!reduced && !isTouch) {
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function animate() {
      // dot follows tightly
      dotX += (mouseX - dotX) * 0.45;
      dotY += (mouseY - dotY) * 0.45;
      // ring lags
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // Hover state on interactive targets
    const hoverSelectors = 'a, button, .entry, .btn, .p-cta, .part-link, .hero-title em, .pullquote';
    document.querySelectorAll(hoverSelectors).forEach((el) => {
      el.addEventListener('mouseenter', () => {
        dot.classList.add('is-hover');
        ring.classList.add('is-hover');
      });
      el.addEventListener('mouseleave', () => {
        dot.classList.remove('is-hover');
        ring.classList.remove('is-hover');
      });
    });
  }

  /* -------------------------------------------------------
     2. KINETIC LETTER REVEAL
     Wraps each character in a span, staggers opacity/translateY.
     Triggered immediately on load for above-fold headings,
     and via IntersectionObserver for below-fold ones.
     ------------------------------------------------------- */
  function splitKinetic(el) {
    if (el.dataset.split === '1') return;
    el.dataset.split = '1';
    const text = el.textContent;
    el.innerHTML = '';
    [...text].forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'char' + (char === ' ' ? ' space' : '');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.transitionDelay = `${i * 32}ms`;
      el.appendChild(span);
    });
  }

  document.querySelectorAll('.kinetic').forEach(splitKinetic);

  // Reveal above-fold immediately
  if (reduced) {
    document.querySelectorAll('.kinetic').forEach((el) => el.classList.add('is-revealed'));
  } else {
    // Stagger reveal so first kinetic block plays slightly after load paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll('.kinetic.kinetic-onload').forEach((el) => {
          el.classList.add('is-revealed');
        });
      }, 240);
    });
  }

  /* -------------------------------------------------------
     3. INTERSECTION OBSERVER — reveal on scroll
     Applies to .reveal and to .kinetic that's NOT marked onload.
     ------------------------------------------------------- */
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains('kinetic') && !entry.target.classList.contains('kinetic-onload')) {
            entry.target.classList.add('is-revealed');
          }
          if (entry.target.classList.contains('reveal')) {
            entry.target.classList.add('is-in');
          }
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '-10% 0px -10% 0px', threshold: 0.05 });

    document.querySelectorAll('.reveal, .kinetic:not(.kinetic-onload)').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    document.querySelectorAll('.kinetic').forEach((el) => el.classList.add('is-revealed'));
  }

  /* -------------------------------------------------------
     4. WORD-BREAK on hover for designated headlines
     Wraps each word; on hover, gives each word a small random shift.
     ------------------------------------------------------- */
  function splitWords(el) {
    if (el.dataset.words === '1') return;
    el.dataset.words = '1';
    const text = el.textContent;
    el.innerHTML = '';
    text.split(/(\s+)/).forEach((token) => {
      if (/^\s+$/.test(token)) {
        el.appendChild(document.createTextNode(token));
      } else {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = token;
        // pre-compute a tiny random shift target
        const dx = (Math.random() * 6 - 3).toFixed(1);
        const dy = (Math.random() * 6 - 3).toFixed(1);
        span.style.setProperty('--word-dx', `${dx}px`);
        span.style.setProperty('--word-dy', `${dy}px`);
        el.appendChild(span);
      }
    });
  }

  document.querySelectorAll('.word-break').forEach((el) => {
    splitWords(el);
    if (!reduced) {
      el.addEventListener('mouseenter', () => {
        el.querySelectorAll('.word').forEach((w) => {
          w.style.transform = `translate(${w.style.getPropertyValue('--word-dx')}, ${w.style.getPropertyValue('--word-dy')})`;
        });
      });
      el.addEventListener('mouseleave', () => {
        el.querySelectorAll('.word').forEach((w) => {
          w.style.transform = 'translate(0,0)';
        });
      });
    }
  });

  /* -------------------------------------------------------
     5. PAGE TRANSITION — fade-to-accent overlay
     Links with [data-transition] (and same-origin .html targets)
     get a brief overlay before navigation.
     ------------------------------------------------------- */
  if (!reduced) {
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    document.body.appendChild(overlay);

    // On page show (back/forward) reset state
    window.addEventListener('pageshow', () => {
      overlay.classList.remove('is-active');
    });

    document.querySelectorAll('a[data-transition], a[href$=".html"]').forEach((link) => {
      // skip external / hash links
      const href = link.getAttribute('href') || '';
      if (!href.endsWith('.html')) return;

      link.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || link.target === '_blank') return;
        e.preventDefault();
        overlay.classList.add('is-active');
        setTimeout(() => { window.location.href = href; }, 520);
      });
    });
  }

  /* -------------------------------------------------------
     6. PULL-QUOTE soft pulse — fades + tiny shadow shift once
     when first scrolled into view.
     ------------------------------------------------------- */
  if (!reduced && 'IntersectionObserver' in window) {
    const qo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const q = entry.target;
          q.animate(
            [
              { textShadow: '0 0 0 rgba(0,0,0,0)' },
              { textShadow: '0 0 22px rgba(0,0,0,0.06)' },
              { textShadow: '0 0 0 rgba(0,0,0,0)' },
            ],
            { duration: 2400, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
          );
          qo.unobserve(q);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.pullquote').forEach((q) => qo.observe(q));
  }
})();
