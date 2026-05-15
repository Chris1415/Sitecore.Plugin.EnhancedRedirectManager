/* ============================================================
   NEO BRUTALISM — interaction script
   Stamp clicks, type-on hero, number tickup, hover wobble.
   No frameworks. Vanilla DOM only.
   ============================================================ */

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----------------------------------------------------------
  // 1. STAMP CLICK
  //    Buttons / cards with .btn or .stamp-card or .add-redirect-btn
  //    get a "stamped" class for ~120ms then release.
  // ----------------------------------------------------------
  const stampSelectors = '.btn, .stamp-card, .add-redirect-btn, .map-card';
  document.addEventListener('click', function (e) {
    const target = e.target.closest(stampSelectors);
    if (!target) return;
    // Don't permanently consume nav clicks — animate then let the link follow.
    target.classList.add('is-stamped');
    setTimeout(function () {
      target.classList.remove('is-stamped');
    }, 140);
  });

  // ----------------------------------------------------------
  // 2. HOVER WOBBLE ALTERNATION
  //    Map cards alternate rotation direction on hover so two
  //    adjacent cards don't lean the same way.
  // ----------------------------------------------------------
  if (!reducedMotion) {
    const cards = document.querySelectorAll('.map-card, .mini-tile, .redirect-row');
    cards.forEach(function (el, idx) {
      el.addEventListener('mouseenter', function () {
        const angle = idx % 2 === 0 ? -0.7 : 0.7;
        el.style.transform = 'rotate(' + angle + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  // ----------------------------------------------------------
  // 3. TYPE-ON HEADLINE
  //    Element with .js-type gets its data-text typed in
  //    char-by-char with monospace cadence.
  // ----------------------------------------------------------
  const typeEls = document.querySelectorAll('.js-type');
  typeEls.forEach(function (el) {
    const full = el.getAttribute('data-text') || el.textContent.trim();
    if (reducedMotion) {
      el.textContent = full;
      return;
    }
    el.textContent = '';
    let i = 0;
    const tick = function () {
      if (i <= full.length) {
        el.textContent = full.slice(0, i);
        i++;
        // Slight jitter in timing to feel mechanical, not metronomic
        setTimeout(tick, 38 + (i % 5 === 0 ? 24 : 0));
      }
    };
    setTimeout(tick, 320);
  });

  // ----------------------------------------------------------
  // 4. NUMBER TICKUP WITH STEPS
  //    Elements with .js-tick and data-target=N count up using
  //    discrete steps (looks 8-bit, not smooth).
  // ----------------------------------------------------------
  const tickEls = document.querySelectorAll('.js-tick');
  tickEls.forEach(function (el) {
    const target = parseInt(el.getAttribute('data-target') || '0', 10);
    if (reducedMotion || target === 0) {
      el.textContent = target;
      return;
    }
    const steps = Math.min(target, 24);
    const totalMs = 700;
    const stepMs = totalMs / steps;
    let current = 0;
    let stepIdx = 0;
    const tick = function () {
      stepIdx++;
      current = Math.round((stepIdx / steps) * target);
      el.textContent = current;
      if (stepIdx < steps) {
        setTimeout(tick, stepMs);
      } else {
        el.textContent = target;
      }
    };
    // Stagger start so multiple tickers don't sync
    const delay = 200 + Math.random() * 250;
    setTimeout(tick, delay);
  });

  // ----------------------------------------------------------
  // 5. RANDOM STAMP ROTATION on .stamp elements
  //    Each .stamp gets a slight unique tilt so they read as
  //    hand-applied rubber stamps, not CSS clones.
  // ----------------------------------------------------------
  const stamps = document.querySelectorAll('.stamp');
  stamps.forEach(function (s) {
    // Skip if author already set rotation via inline style
    if (s.style.transform) return;
    // Deterministic per-element jitter from text content
    const seed = (s.textContent || '').charCodeAt(0) || 65;
    const rot = ((seed % 7) - 3) + (Math.random() < 0.5 ? -0.5 : 0.5);
    s.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';
  });

  // ----------------------------------------------------------
  // 6. SOFT CONSOLE BREADCRUMB
  // ----------------------------------------------------------
  if (window && window.console) {
    console.log('%c REDIRECT MANAGER — NEO BRUTALISM ',
      'background:#000;color:#ffe600;font-family:monospace;font-weight:bold;padding:4px 8px;');
    console.log('%c no bullshit, just redirects ',
      'background:#ffe600;color:#000;font-family:monospace;padding:2px 6px;');
  }
})();
