/**
 * inject-blok-nova-vars.ts — Blok Nova CSS variable injection for jsdom tests.
 *
 * Problem: jsdom does not apply stylesheet-based CSS rules, so getComputedStyle()
 * returns '' for any property set via a CSS class rule that references a custom
 * property. Setting the variables directly on document.documentElement.style
 * allows assertions that confirm tokens are DEFINED and NOT collapsed to the
 * jsdom default ('rgb(0, 0, 0)' / empty string).
 *
 * Values are resolved from app/globals.css light-mode :root block:
 *   --destructive        → --color-danger-500    → #d92739
 *   --destructive-background → --color-danger-100 → #ffe4e2
 *   --warning            → --color-warning-500   → #ba5200
 *   --warning-foreground → --color-warning-600   → #953d00
 *   --success            → --color-success-500   → #007f66
 *   --color-green-600                            → #006450
 *   --muted-foreground   → --color-blackAlpha-500 → rgba(0,0,0,0.55)
 *   --foreground         → --color-blackAlpha-900 → rgba(0,0,0,0.94)
 *   --border             → --color-blackAlpha-200 → rgba(0,0,0,0.11)
 *
 * Source: products/redirect-manager/site/app/globals.css @theme inline block
 *         + :root block (light mode), captured 2026-05-27.
 *
 * NOTE: jsdom does NOT compute class-based CSS rules. This injection enables
 * testing that a CSS variable is non-empty/defined in the jsdom document, which
 * is a proxy for "the token would resolve in a real browser" — the collapse failure
 * pattern (undefined var → currentColor → rgb(0,0,0)) is thus detectable.
 *
 * For dark-mode assertions, call injectBlokNovaDarkVars() and wrap the test
 * element in a parent with class="dark".
 */

// Light-mode resolved values (from globals.css :root)
export function injectBlokNovaLightVars(): void {
  const root = document.documentElement;
  // Semantic tokens used by drift UI
  root.style.setProperty('--destructive', '#d92739');
  root.style.setProperty('--destructive-background', '#ffe4e2');
  root.style.setProperty('--warning', '#ba5200');
  root.style.setProperty('--warning-foreground', '#953d00');
  root.style.setProperty('--success', '#007f66');
  root.style.setProperty('--color-green-600', '#006450');
  root.style.setProperty('--muted-foreground', 'rgba(0,0,0,0.55)');
  root.style.setProperty('--foreground', 'rgba(0,0,0,0.94)');
  root.style.setProperty('--border', 'rgba(0,0,0,0.11)');
}

// Dark-mode resolved values (from globals.css .dark block)
// --destructive → --color-danger-200 → #ffccc8
// --destructive-background → rgba(255, 204, 200, 0.12)
// --muted-foreground → --color-whiteAlpha-600 → rgba(255,255,255,0.68)
// --foreground → --color-white → #ffffff
export function injectBlokNovaDarkVars(): void {
  const root = document.documentElement;
  root.style.setProperty('--destructive', '#ffccc8');
  root.style.setProperty('--destructive-background', 'rgba(255, 204, 200, 0.12)');
  root.style.setProperty('--warning', '#fdd291'); // --color-warning-200 in dark
  root.style.setProperty('--warning-foreground', '#fdd291');
  root.style.setProperty('--success', '#8bebd0'); // --color-success-200 in dark
  root.style.setProperty('--color-green-600', '#8bebd0'); // approx dark success glyph
  root.style.setProperty('--muted-foreground', 'rgba(255,255,255,0.68)');
  root.style.setProperty('--foreground', '#ffffff');
  root.style.setProperty('--border', 'rgba(255,255,255,0.11)');
}

export function clearBlokNovaVars(): void {
  const root = document.documentElement;
  const tokens = [
    '--destructive', '--destructive-background', '--warning', '--warning-foreground',
    '--success', '--color-green-600', '--muted-foreground', '--foreground', '--border',
  ];
  for (const token of tokens) {
    root.style.removeProperty(token);
  }
}
