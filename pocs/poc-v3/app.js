// Redirect Manager — POC v3 "Site Atlas"
// Lightweight helpers: theme toggle + prefers-reduced-motion gating.
// Static clickdummy — no data, no SDK calls.

(function () {
  const STORAGE_KEY = "rm-poc-v3-theme";

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // ignore — file:// can fail localStorage
    }
    if (stored === "dark" || stored === "light") {
      applyTheme(stored);
      return stored;
    }
    return "light";
  }

  function bindToggle() {
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      const isDark = document.documentElement.classList.contains("dark");
      const next = isDark ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        // ignore
      }
      btn.setAttribute(
        "aria-label",
        next === "dark" ? "Switch to light theme" : "Switch to dark theme",
      );
    });
  }

  // Reduced-motion check — disable minimap pulse animation if requested.
  // The CSS @media block already covers this; we additionally drop the
  // `is-here` animation class on JS init for browsers that ignore the
  // CSS query inside @keyframes (a defensive belt-and-braces).
  function gateReducedMotion() {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      document
        .querySelectorAll(".minimap-node.is-here")
        .forEach(function (n) {
          n.style.animation = "none";
        });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    bindToggle();
    gateReducedMotion();
  });
})();
