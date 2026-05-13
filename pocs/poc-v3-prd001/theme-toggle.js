/* Theme toggle for the v1 Operator Console clickdummy.
 *
 * Auto-injects a small fixed button (top-right) that cycles:
 *   System → Light → Dark → System
 *
 * Persisted in localStorage so the choice survives navigation between frames.
 * Removed for production — the live app inherits theme from Cloud Portal.
 */

(function () {
  "use strict";

  var STORAGE_KEY = "redirect-manager-poc-theme";

  function getStoredTheme() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === "light" || v === "dark" ? v : "system";
    } catch (e) {
      return "system";
    }
  }

  function setStoredTheme(theme) {
    try {
      if (theme === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* swallow — preview-only convenience */
    }
  }

  function applyTheme(theme) {
    var html = document.documentElement;
    html.classList.remove("light", "dark");
    if (theme === "light") html.classList.add("light");
    else if (theme === "dark") html.classList.add("dark");
    /* "system" leaves both off — prefers-color-scheme media query takes over. */
  }

  function nextTheme(current) {
    if (current === "system") return "light";
    if (current === "light") return "dark";
    return "system";
  }

  function labelFor(theme) {
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";
    return "System";
  }

  function injectStyle() {
    if (document.getElementById("theme-toggle-style")) return;
    var style = document.createElement("style");
    style.id = "theme-toggle-style";
    style.textContent = [
      ".theme-toggle{",
      "  position:fixed;top:0.75rem;right:0.75rem;z-index:9999;",
      "  display:inline-flex;align-items:center;gap:0.375rem;",
      "  padding:0.25rem 0.5rem 0.25rem 0.625rem;",
      "  height:1.875rem;border-radius:999px;",
      "  background:var(--card);color:var(--foreground);",
      "  border:1px solid var(--border-a11y);",
      "  font:500 var(--text-2xs)/1 var(--font-sans);",
      "  cursor:pointer;user-select:none;",
      "  box-shadow:var(--shadow-sm);",
      "  transition:background-color 120ms ease,border-color 120ms ease;",
      "}",
      ".theme-toggle:hover{background:var(--muted);border-color:var(--input)}",
      ".theme-toggle:focus-visible{outline:2px solid var(--ring);outline-offset:2px}",
      ".theme-toggle__dot{",
      "  width:0.625rem;height:0.625rem;border-radius:50%;",
      "  background:var(--primary);box-shadow:0 0 0 1px var(--card),0 0 0 2px var(--primary);",
      "}",
      ".theme-toggle__label{",
      "  font-family:var(--font-sans);",
      "  font-weight:500;font-size:var(--text-2xs);",
      "  letter-spacing:0.04em;text-transform:uppercase;",
      "  color:var(--muted-foreground);",
      "}",
      ".theme-toggle__value{",
      "  font-family:var(--font-mono);",
      "  font-variant-numeric:tabular-nums;",
      "  font-size:var(--text-2xs);font-weight:600;",
      "  color:var(--foreground);",
      "}",
      "@media (prefers-reduced-motion: reduce){",
      "  .theme-toggle{transition:none}",
      "}",
    ].join("");
    document.head.appendChild(style);
  }

  function injectButton(initialTheme) {
    if (document.getElementById("theme-toggle-btn")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "theme-toggle-btn";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-live", "polite");
    btn.setAttribute("title", "Cycle theme: System → Light → Dark");

    var dot = document.createElement("span");
    dot.className = "theme-toggle__dot";
    dot.setAttribute("aria-hidden", "true");

    var label = document.createElement("span");
    label.className = "theme-toggle__label";
    label.textContent = "Theme";

    var value = document.createElement("span");
    value.className = "theme-toggle__value";
    value.textContent = labelFor(initialTheme);

    btn.appendChild(dot);
    btn.appendChild(label);
    btn.appendChild(value);

    btn.addEventListener("click", function () {
      var current = getStoredTheme();
      var next = nextTheme(current);
      setStoredTheme(next);
      applyTheme(next);
      value.textContent = labelFor(next);
    });

    document.body.appendChild(btn);
  }

  /* Apply stored theme on load — runs before the button paints to avoid flash. */
  applyTheme(getStoredTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      injectStyle();
      injectButton(getStoredTheme());
    });
  } else {
    injectStyle();
    injectButton(getStoredTheme());
  }
})();
