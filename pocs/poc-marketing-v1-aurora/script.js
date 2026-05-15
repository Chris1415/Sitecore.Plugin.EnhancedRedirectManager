/* Aurora — minimal vanilla JS for marketing-grade micro-interactions */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero text reveal (character-by-character) ---------- */
  function revealHeadline() {
    if (reducedMotion) return;
    const heads = document.querySelectorAll('[data-reveal]');
    heads.forEach((el) => {
      const text = el.textContent;
      el.textContent = '';
      const fragment = document.createDocumentFragment();
      let idx = 0;
      text.split(/(\s+)/).forEach((word) => {
        if (/^\s+$/.test(word)) {
          fragment.appendChild(document.createTextNode(word));
          return;
        }
        const span = document.createElement('span');
        span.className = 'reveal-word';
        span.style.display = 'inline-block';
        word.split('').forEach((ch) => {
          const charSpan = document.createElement('span');
          charSpan.className = 'reveal-char';
          charSpan.textContent = ch;
          charSpan.style.animationDelay = `${idx * 28}ms`;
          idx += 1;
          span.appendChild(charSpan);
        });
        fragment.appendChild(span);
      });
      el.appendChild(fragment);
    });
  }

  /* ---------- Number count-up ---------- */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateNumber(el, target, durationMs = 1400) {
    if (reducedMotion) {
      el.textContent = formatNumber(target);
      return;
    }
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);
      const value = Math.round(target * eased);
      el.textContent = formatNumber(value);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function runCountUps() {
    document.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (Number.isNaN(target)) return;
      animateNumber(el, target, 1400);
    });
  }

  /* ---------- Cursor glow ---------- */
  function setupCursorGlow() {
    if (reducedMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const dot = document.createElement('div');
    dot.className = 'cursor-glow';
    document.body.appendChild(dot);

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currX = targetX;
    let currY = targetY;
    let visible = false;

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        dot.classList.add('visible');
        visible = true;
      }
    });

    document.addEventListener('mouseleave', () => {
      dot.classList.remove('visible');
      visible = false;
    });

    function loop() {
      // smooth follow with lag
      currX += (targetX - currX) * 0.18;
      currY += (targetY - currY) * 0.18;
      dot.style.left = currX + 'px';
      dot.style.top = currY + 'px';
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Expand on interactive elements
    document.querySelectorAll('a, button, .feature-card, .map-card, .widget-tile').forEach((node) => {
      node.addEventListener('mouseenter', () => {
        dot.style.width = '60px';
        dot.style.height = '60px';
      });
      node.addEventListener('mouseleave', () => {
        dot.style.width = '32px';
        dot.style.height = '32px';
      });
    });
  }

  /* ---------- Status pill hover halo (already CSS — JS adds a subtle ripple) ---------- */
  function setupRipple() {
    document.querySelectorAll('[data-ripple]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (reducedMotion) return;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.left = e.clientX - rect.left + 'px';
        ripple.style.top = e.clientY - rect.top + 'px';
        ripple.style.width = '6px';
        ripple.style.height = '6px';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.4)';
        ripple.style.transform = 'translate(-50%, -50%) scale(1)';
        ripple.style.transition = 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms ease-out';
        ripple.style.pointerEvents = 'none';
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(ripple);
        requestAnimationFrame(() => {
          ripple.style.transform = 'translate(-50%, -50%) scale(40)';
          ripple.style.opacity = '0';
        });
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    revealHeadline();
    runCountUps();
    setupCursorGlow();
    setupRipple();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
