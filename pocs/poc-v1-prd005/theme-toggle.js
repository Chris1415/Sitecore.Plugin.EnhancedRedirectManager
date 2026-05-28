/* ============================================================================
 * theme-toggle.js — POC light/dark/auto theme switcher
 *
 * Production replacement: PRD-000's existing ThemeSwitcher at
 * site/components/theme-switcher.tsx (carry-over from PRD-002 architecture
 * § 2.3). The POC re-implements the surface in vanilla JS for self-contained
 * file:// + npx serve usability.
 * ============================================================================ */

(function () {
  var STORAGE_KEY = "rm-prd002-theme";

  function applyTheme(theme, buttons) {
    document.documentElement.classList.remove("light", "dark");
    if (theme === "dark") document.documentElement.classList.add("dark");
    else if (theme === "light") document.documentElement.classList.add("light");
    // 'auto' relies on @media (prefers-color-scheme: dark) — no class added.
    buttons.forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        b.dataset.theme === theme ? "true" : "false"
      );
    });
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // Storage unavailable (incognito etc) — silent.
    }
  }

  function init() {
    var toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;
    var buttons = toggle.querySelectorAll("[data-theme]");
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        applyTheme(b.dataset.theme, buttons);
      });
    });
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    applyTheme(saved || "auto", buttons);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
