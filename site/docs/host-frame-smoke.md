# Host-frame visual smoke

> T064 — Visual regression smoke against the POC clickdummy ground truth.

The original task breakdown called for a `/test` route hosting a Playwright-driven visual comparison harness. After Tranches 6b–8, the operator-led smoke flow (manual review against the POC HTML inside Cloud Portal) covers the same intent with much less harness machinery. This document captures the **manual procedure** so it can be repeated on demand.

If a future tranche reintroduces automated visual regression, the canonical recipe is the `sitecore:marketplace-sdk-host-frame-testing` skill — it scripts Playwright to load the app inside Cloud Portal, clip the iframe origin, and compare against the POC clickdummy with a configurable pixel tolerance.

## Manual procedure

### 1. Open the POC reference

Open `products/redirect-manager/pocs/poc-v1/` in a browser. Each extension point has its own HTML file:

- `pocs/poc-v1/context-panel.html`
- `pocs/poc-v1/dashboard-widget.html`
- `pocs/poc-v1/full-page.html`
- plus a few state-coverage variants (`full-page-empty-no-selection.html`, etc.)

These are the **ground truth**. The shipped app should match them within visual tolerance.

### 2. Open the live app

In Cloud Portal, open each extension point in its real host:

- **Context Panel** — Pages → side-panel dropdown → "Redirects"
- **Dashboard Widget** — Cloud Portal Dashboard for any site → "Redirects summary" tile
- **Full Page** — Cloud Portal launcher → "Redirect Manager"

### 3. Side-by-side comparison

For each extension point:

- Set the operator's primary browser window to the **POC HTML** (open from `pocs/poc-v1/`).
- Set a second window to the **live app inside Cloud Portal**.
- Match viewport sizes (~1440×900 for Full Page, narrower for Context Panel).
- Visually compare. Acceptable drift includes:
  - Real data values (POCs use placeholders like `My Redirect Map`)
  - Last-updated timestamps
  - Sonner toast positions (only visible mid-write)
- Unacceptable drift:
  - Major layout shifts (panes flipped, rail width wildly different)
  - Missing affordances (no edit button, missing "+ Add" button)
  - Color regressions (background tone, primary chip colour)
  - Typography regressions (heading size, body font drift)

### 4. Record outcomes

Note any drift in `project-planning/workflow/friction-log-{run-id}.md`. Each entry should reference:

- Which extension point
- The drift type (layout / colour / typography / affordance)
- POC reference file
- Suggested fix (or `defer` if cosmetic)

## Optional: Automated harness

If the project grows enough to justify automated visual regression:

1. Add `@playwright/test` as a dev dependency.
2. Generate a `/test` route that renders the three extension points side-by-side.
3. Use the recipe in `sitecore:marketplace-sdk-host-frame-testing` to:
   - Navigate Playwright to Cloud Portal's host URL.
   - Locate each iframe origin.
   - Clip the iframe content area.
   - Compare against the POC clickdummy with pixel-tolerance.
4. Wire as a CI job (only on tagged releases — full Cloud Portal session is slow).

This is **not** required for PRD-000 ship — manual smoke is sufficient at the current scale.
