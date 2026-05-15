# Cloud Portal Test App registration runbook

> T063 — One-time setup for running Redirect Manager inside Cloud Portal.
>
> **PRD-002 carry-over:** No re-registration is needed for PRD-002. The App ID, the three extension-point identifiers, and all API scopes are unchanged. The V4 redesign is a purely client-side change; the Cloud Portal Test App entry remains valid.

The Redirect Manager is a **Sitecore Marketplace Client-Side app** (Mode A). It runs entirely in the browser inside an iframe hosted by Cloud Portal. To make it visible to operators, register it as a Test App in your tenant's Cloud Portal.

## Prerequisites

- Admin access to the Cloud Portal organization.
- The app deployed to a public HTTPS URL (or running locally on `http://localhost:3000` for development — Cloud Portal accepts HTTP localhost in test apps).
- A target XM Cloud tenant in the same organization (the operator will pick this in step 5 below).

## Registration steps

1. **Open Cloud Portal → App Studio.**
   Navigate to <https://portal.sitecorecloud.io/> → top-right launcher → **App Studio**.

2. **Create a new Custom App (or Test App).**
   App Studio sidebar → **Apps** → **Create app**. Pick **Custom app** (the app stays in your org; submit later as Public if you want to share it).

3. **App identity fields:**

   | Field | Value |
   |-------|-------|
   | **Name** | `Redirect Manager` |
   | **Description** | `Manage Sitecore Redirect Map items across collections / sites — CRUD, JSON import/export, dashboard counts.` |
   | **Icon** | upload a 256×256 PNG, or skip for the default |
   | **Type** | **Custom** (Mode A — client-side only) |

4. **App URL.**
   Set the **App URL** to the **root** of the deployed app (or `http://localhost:3000` for local dev). Cloud Portal appends each extension's route URL to this base.

5. **Register the three extension points.**
   In **App Studio → Extension points** for the new app, add these three entries. The values map directly to `ADR-0011`.

   | Extension Point | Route URL | Display Label |
   |-----------------|-----------|---------------|
   | `xmc:pages:contextpanel` | `/context-panel` | `Redirects` |
   | `xmc:dashboardblocks` | `/dashboard-widget` | `Redirects summary` |
   | `xmc:fullscreen` | `/full-page` | `Redirect Manager` |

   **Tip:** the easiest way to get the exact paste-in values is to invoke `sitecore:marketplace-sdk-extension-routes` — it produces a copy/paste-ready table per extension point.

6. **Scopes / API permissions.**
   Under **API access** for the app, grant:
   - `sitecore.xmcloud.sites:read`
   - `sitecore.xmcloud.authoring.graphql:read`
   - `sitecore.xmcloud.authoring.graphql:write`

   The app reads the site list and Authoring GraphQL (read + write) for redirect map CRUD.

7. **Allowed origins / iframe ancestors.**
   No action needed — Cloud Portal handles iframe parent-frame setup automatically for registered apps.

8. **Save and assign to tenant(s).**
   In **App Studio → Tenants**, attach the app to the target XM Cloud tenant(s). The app becomes available in:
   - **Pages** → Context Panel dropdown → "Redirects" (per page)
   - **Cloud Portal Dashboard** → "Redirects summary" widget (per site)
   - **Cloud Portal launcher** → "Redirect Manager" (full-page launcher)

## Verification

Once registered:

1. Open the assigned tenant.
2. Launch **Pages** for any site → open a page → side panel → "Redirects". The Context Panel should render in the side panel.
3. Open the launcher → "Redirect Manager". The Full Page surface should render full-screen.
4. Open the Cloud Portal Dashboard for any site → look for the "Redirects summary" widget tile.

## Local development workflow

For local development with HTTPS (required for some Cloud Portal features):

1. Register `https://localhost:3000` as the App URL in a separate "Local Dev" test app.
2. Run `npm run dev` in `products/redirect-manager/site/` — Next 16 dev server starts at `http://localhost:3000`.
3. If your tenant requires HTTPS for embedded apps, run `mkcert` + Next's `--experimental-https` flag.
4. Load the same tenant — the local app appears alongside the deployed one.

## Public app submission (optional)

If you later submit the app for public listing in the Sitecore Marketplace:

1. Run `sitecore:marketplace-sdk-lifecycle` for the full public-app submission checklist.
2. Key Blok compliance points: top-right close-button affordance present, dark-mode contrast verified, no horizontal scroll inside any extension point.
3. Submit via App Studio → **Submit for review**.

## Linked artefacts

- ADR-0011 (`project-planning/ADR/adr-0011-extension-points-and-routes.md`) — extension point identifiers
- ADR-0002 (`adr-0002-marketplace-sdk-mode-a-scaffold.md`) — Mode A scaffold decision
- The three smoke checklists under `docs/smoke-*.md`
