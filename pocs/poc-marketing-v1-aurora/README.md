# Aurora — Redirect Manager (Marketing Exploration V1)

**Direction:** Aurora — premium SaaS landing-page energy applied to an internal Sitecore Marketplace tool. Imagine Linear, Vercel, or Resend designed Redirect Manager: gradient-mesh backgrounds, frosted-glass cards, generous typography, and motion that whispers rather than shouts. Redirect-management content is real (maps, source→target URLs, language indicators, status pills) but every surface is treated as a marketing-grade moment.

## How to view

```
cd products/redirect-manager/pocs/poc-marketing-v1-aurora
npx serve
```

Then open the URL the server prints (typically `http://localhost:3000`). Start at `index.html`.

## Link graph

- `index.html` — hero landing for the direction. Three feature cards link to the three extension-point surfaces. Primary CTA links to `full-page.html`.
- `full-page.html` — Full Page surface (roomy "manage redirects" workspace). Top-nav links back to landing + sideways to the other two surfaces.
- `context-panel.html` — Context Panel surface (~360px narrow column). Top-nav back to landing + sideways links.
- `dashboard-widget.html` — Dashboard Widget surface (~480px tile). Top-nav back to landing + sideways links.

All four pages share `styles.css` and `script.js`. Vanilla HTML/CSS/JS, no build step. Google Fonts CDN for Inter + Space Grotesk.
