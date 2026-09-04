/**
 * Sets Blok Nova CSS variables directly on document.documentElement.style,
 * because jsdom does not apply class-based stylesheet rules — getComputedStyle
 * returns '' for anything set through a class that references a custom property.
 *
 * ⚠ This is a PROXY for "the token would resolve in a real browser", not proof
 * of the cascade. It detects the collapse chain (undefined var → currentColor →
 * rgb(0,0,0)). See docs/build-decisions.md#jsdom-token-injection.
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
