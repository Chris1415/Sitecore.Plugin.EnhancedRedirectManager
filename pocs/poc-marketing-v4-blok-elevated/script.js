/* ============================================================================
 * Blok Elevated — V4 motion + interactions
 *
 * Discipline: minimal, vanilla, no frameworks. Every animation respects
 * prefers-reduced-motion. Easing throughout: cubic-bezier(0.16, 1, 0.3, 1)
 * (the Blok premium ease) and easeOutCubic for numeric counters.
 * ============================================================================ */

(function () {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ---- Letter-by-letter reveal on hero headlines -------------------------
  function wrapForLetterReveal() {
    const targets = document.querySelectorAll("[data-letter-reveal]");
    targets.forEach((node) => {
      if (node.dataset.letterRevealApplied === "true") return;
      const text = node.textContent;
      node.textContent = "";
      Array.from(text).forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "letter";
        span.style.cssText =
          "display:inline-block;opacity:0;transform:translateY(0.4em);" +
          "transition:opacity 600ms cubic-bezier(0.16,1,0.3,1) " +
          (i * 28) +
          "ms,transform 600ms cubic-bezier(0.16,1,0.3,1) " +
          (i * 28) +
          "ms;";
        span.textContent = ch === " " ? "\u00A0" : ch;
        node.appendChild(span);
      });
      node.dataset.letterRevealApplied = "true";
      // trigger
      requestAnimationFrame(() => {
        node.querySelectorAll(".letter").forEach((l) => {
          l.style.opacity = "1";
          l.style.transform = "translateY(0)";
        });
      });
    });
  }

  // ---- Count-up for [data-count] ----------------------------------------
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function countUp(node) {
    const end = Number(node.dataset.count || node.textContent || "0");
    const duration = Number(node.dataset.duration || 1200);
    if (prefersReducedMotion) {
      node.textContent = end.toLocaleString("en-US");
      return;
    }
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      const value = Math.round(end * eased);
      node.textContent = value.toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function arm(target, fn) {
    if (!("IntersectionObserver" in window)) {
      fn(target);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            fn(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(target);
  }

  // ---- Dashboard widget bar fills ---------------------------------------
  function armBars() {
    document.querySelectorAll("[data-bar-fill]").forEach((el) => {
      arm(el, (node) => {
        const target = node.dataset.barFill;
        requestAnimationFrame(() => {
          node.style.width = target + "%";
        });
      });
    });
  }

  // ---- Theme toggle (light / dark / auto) -------------------------------
  function armThemeToggle() {
    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;
    const buttons = toggle.querySelectorAll("[data-theme]");
    function applyTheme(theme) {
      document.documentElement.classList.remove("light", "dark");
      if (theme === "dark") document.documentElement.classList.add("dark");
      else if (theme === "light") document.documentElement.classList.add("light");
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.theme === theme ? "true" : "false")
      );
      try { localStorage.setItem("rm-v4-theme", theme); } catch (e) {}
    }
    buttons.forEach((b) =>
      b.addEventListener("click", () => applyTheme(b.dataset.theme))
    );
    let saved = null;
    try { saved = localStorage.getItem("rm-v4-theme"); } catch (e) {}
    applyTheme(saved || "auto");
  }

  // ---- Init -------------------------------------------------------------
  function init() {
    if (!prefersReducedMotion) wrapForLetterReveal();
    document.querySelectorAll("[data-count]").forEach((el) => arm(el, countUp));
    armBars();
    armThemeToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
