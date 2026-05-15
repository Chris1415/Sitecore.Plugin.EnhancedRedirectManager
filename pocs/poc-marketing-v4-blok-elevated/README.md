# Blok Elevated — V4 marketing exploration

What if Blok shipped a marketing-grade aesthetic? This variant takes the Sitecore Blok design system — its Geist Sans + Geist Mono stack, its lavender `--primary`, its `--card` / `--muted` / `--border` semantic tokens, its component anatomy — and layers on premium composition: hero typography up to ~92px with gradient-text from `linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 55%, var(--info)))`, primary-tinted card lift on hover via `color-mix(in oklch, var(--primary) 14%, transparent)`, drifting radial backdrops, count-up stat tiles with `easeOutCubic`, a frosted-glass topnav, and a 72px dashboard widget hero number paired with a token-gradient sparkline. Every elevation step composes Blok semantic tokens through `color-mix(in oklch, …)` — no invented hex, no off-Blok typefaces, no custom palettes. It is unmistakably Blok, dressed for a marketing page.

## Frames

- `index.html` — landing / hero with gradient headline, hero product preview card, surfaces grid, trust-band count-ups
- `full-page.html` — operator workspace with marketing banner moment, count-up stat strip, map detail table
- `context-panel.html` — 360px narrow surface with gradient header and hero summary tile
- `dashboard-widget.html` — 480px tile with 72px gradient hero number, token-gradient sparkline, top-destinations bars

## Open it

```bash
npx serve products/redirect-manager/pocs/poc-marketing-v4-blok-elevated
```

Or simply double-click `index.html` to open via `file://`.
