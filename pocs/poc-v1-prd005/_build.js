/*
 * _build.js — POC scaffolder. Generates -dark.html and -mobile.html derivative
 * files from the 7 base screen-test-*.html frames. NOT shipped — produces the
 * static files that are themselves the deliverable, then can be deleted or
 * ignored. Run with `node _build.js` from this directory.
 *
 * Dark variant: pin localStorage to "dark", visually flip the tone-toggle.
 * Mobile variant: add `data-mobile-preview` on <body> + a viewport meta lock to
 * 420px so the existing <768px mobile CSS branch kicks in. Operator can still
 * resize the window.
 */

const fs = require("fs");
const path = require("path");

const BASES = [
  "screen-test-idle",
  "screen-test-checking",
  "screen-test-in-sync",
  "screen-test-drifted",
  "screen-test-error-rate-limit",
  "screen-test-error-not-found",
  "screen-test-error-network",
];

const DARK_PRELOAD =
  '<script>try{localStorage.setItem("rm-prd002-theme","dark");}catch(e){}</script>';

const MOBILE_STYLE = `<style>
  /* Mobile preview: cap body width to simulate a 420px viewport so the
     existing <768px responsive branch renders even on a desktop. The
     two-column Test grid stacks into a single column per prd004.css §18. */
  html, body { background: var(--background); }
  body[data-mobile-preview] {
    max-width: 420px;
    margin: 0 auto;
    box-shadow: 0 0 0 1px var(--border), 0 24px 60px rgba(0,0,0,0.18);
    min-height: 100vh;
  }
  /* Force the stack behavior at any width when mobile-preview is on. */
  body[data-mobile-preview] .test-surface-twocol {
    grid-template-columns: 1fr !important;
    gap: 0.75rem !important;
    padding: 0 1rem 2rem !important;
  }
  body[data-mobile-preview] .test-rail {
    position: static !important;
    max-height: none !important;
  }
  body[data-mobile-preview] .fp-hero {
    padding: 1.25rem 1.25rem;
  }
  body[data-mobile-preview] .fp-topbar {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
  }
  body[data-mobile-preview] .fp-topbar__actions {
    flex-wrap: wrap;
  }
  body[data-mobile-preview] .drift-banner__dismiss {
    width: 2.75rem;
    height: 2.75rem;
  }
</style>`;

for (const base of BASES) {
  const srcPath = path.join(__dirname, `${base}.html`);
  if (!fs.existsSync(srcPath)) {
    console.warn(`skip: ${base}.html missing`);
    continue;
  }
  const src = fs.readFileSync(srcPath, "utf8");

  // --- DARK ---
  let dark = src
    // tone-toggle pressed state: Light off, Dark on, Auto off
    .replace(
      /<button class="tone-toggle__btn" data-theme="light" aria-pressed="true">Light<\/button>\s*<button class="tone-toggle__btn" data-theme="dark" aria-pressed="false">Dark<\/button>\s*<button class="tone-toggle__btn" data-theme="auto" aria-pressed="false">Auto<\/button>/,
      '<button class="tone-toggle__btn" data-theme="light" aria-pressed="false">Light</button>\n      <button class="tone-toggle__btn" data-theme="dark" aria-pressed="true">Dark</button>\n      <button class="tone-toggle__btn" data-theme="auto" aria-pressed="false">Auto</button>'
    )
    // inject preload script as the FIRST <head> child so it runs before theme-toggle.js
    .replace(/<\/head>/, `    ${DARK_PRELOAD}\n  </head>`)
    // title swap
    .replace(/<title>([^<]+)<\/title>/, "<title>$1 · dark</title>");
  fs.writeFileSync(path.join(__dirname, `${base}-dark.html`), dark, "utf8");

  // --- MOBILE ---
  let mobile = src
    .replace(/<body>/, '<body data-mobile-preview>')
    .replace(/<\/head>/, `    ${MOBILE_STYLE}\n  </head>`)
    .replace(/<title>([^<]+)<\/title>/, "<title>$1 · mobile</title>");
  fs.writeFileSync(path.join(__dirname, `${base}-mobile.html`), mobile, "utf8");

  console.log(`built: ${base}-dark.html, ${base}-mobile.html`);
}
console.log("done.");
