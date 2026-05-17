# Smoke Gate: `m_publish` — SitecoreAI Publish Integration

**PRD-003 Tranche 2 — Real-tenant operator-driven smoke checklist.**

This smoke gate MUST pass before `/ship` is unblocked for PRD-003.
Verdicts are recorded in `project-planning/workflow/run-20260516T194651Z.json` under `smoke_outcomes`.

---

## Pre-conditions

- Operator has `.env.local` configured with all Branch B vars:
  - `SITECORE_PUBLISH_CLIENT_ID` — service client id registered in Cloud Portal
  - `SITECORE_PUBLISH_CLIENT_SECRET` — service client secret
  - `SITECORE_OAUTH_TOKEN_URL` — token endpoint (default: `https://auth.sitecorecloud.io/oauth/token`)
  - `SITECORE_OAUTH_AUDIENCE` — audience (default: `https://api.sitecorecloud.io`)
  - `SITECORE_PUBLISHING_BASE_URL` — Publishing API base (e.g. `https://edge-platform.sitecorecloud.io`)
- The service client has scopes: `xmcpub.jobs.a:w` (or `xmcpub.jobs.t:w`) + `xmcloud.cm:admin`
- At least one site with at least one Redirect Map is loaded in the Full Page workspace
- App is running at `https://localhost:3000` (mkcert HTTPS) in development mode

---

## m_publish-1 — Publish Site happy path

**Steps:**
1. Pick a site with a configured language list (e.g. `en-US, de-DE`)
2. Click **Publish Site** button in the hero CTA area
3. Verify the confirmation dialog appears with title **"Republish site"** and body showing:
   - `Site: <site display name>`
   - `Locales: N being published` (where N matches the site's language count)
   - `Mode: Republish (full)`
   - `Source: Redirect Manager`
4. Click **Republish site** (confirm button)
5. Observe: loading toast appears (`Publishing site — <site display name>`)
6. Observe: success toast replaces it (`Site publish queued — job <first 8 chars of job id>`)

**Expected outcome:**
- HTTP 201 from `/api/publish` route (visible in browser DevTools → Network)
- Job appears in SitecoreAI Cloud Portal → Publishing → Jobs with:
  - `source: Redirect Manager`
  - `system.status: Queued | Running`
  - `options.xmc.site.mode: Republish`
  - `options.xmc.locales: [<enumerated site locales>]`

**A11y / theme note:** verify dialog and button render correctly in Dark, Light, and System themes (theme toggle via `NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER=true`). Confirm ≥ AA contrast on dialog text and action buttons.

**Verdict:** `PASS | FAIL | WARN | DEFERRED`
**Caveats (if WARN):**

---

## m_publish-2 — Per-map Publish happy path

**Steps:**
1. With a site loaded, find any Redirect Map row in the left rail
2. Click the **Send** icon button at the far right of the row (aria-label: `Publish <map name>`)
3. No confirmation dialog should appear — fire-and-forget
4. Observe: loading toast (`Publishing <map name>`)
5. Observe: success toast (`<map name> publish queued — job <first 8 chars>`)
6. While the publish is in-flight: verify the button is disabled (spinner icon) and the row's onSelect does NOT trigger on the button click

**Expected outcome:**
- HTTP 201 from `/api/publish` route
- Job appears in Cloud Portal with:
  - `source: Redirect Manager`
  - `options.items[0].id: <map guid>` (verify against the map's Sitecore item ID)
  - `options.xmc.items.mode: Republish`
  - `options.xmc.items.publishChildren: false`
  - `options.xmc.items.publishRelatedItems: false`

**Verdict:** `PASS | FAIL | WARN | DEFERRED`
**Caveats (if WARN):**

---

## m_publish-3 — Force-error case (revoked / invalid credential)

**Steps:**
1. Temporarily set `SITECORE_PUBLISH_CLIENT_SECRET` to an invalid value in `.env.local`
2. Restart the Next.js dev server
3. Click **Publish Site** → confirm
4. Observe: error toast appears — must contain HTTP status code + API detail or title string

**Expected outcome:**
- Toast message: `Publish failed — <status>: <detail or title>`
- No silent failure — error must be visible in the UI
- Browser Console may show the server-side error log but the secret MUST NOT appear in any response visible in the Network tab

**Verdict:** `PASS | FAIL | WARN | DEFERRED`
**Caveats (if WARN):**

---

## Carry-forward gates (sanity touch)

Re-verify that existing smoke gates are not broken by PRD-003 changes:

- **m1** (PRD-000 — basic app load, site picker, redirect map list): `PASS | FAIL`
- **m3** (PRD-002 — create / edit / delete redirect map CRUD): `PASS | FAIL`

---

## A11y deferred checks (jest-axe not installed)

The following checks are deferred to this manual smoke (T025 axe gate was skipped because `jest-axe` is not in `devDependencies`):

- [ ] Dialog (`PublishSiteConfirmModal`) in dark theme — confirm ≥ AA text contrast on title, description, Cancel and "Republish site" buttons
- [ ] Dialog in light theme — same
- [ ] Per-map `RedirectMapPublishButton` (Send icon) in dark theme — confirm icon and disabled-spinner have ≥ AA contrast with the row background
- [ ] Per-map button in light theme — same
- [ ] `prefers-reduced-motion: reduce` — Loader2 spinner animation should be suppressed (NFR-P4 carry-forward from PRD-002)

---

## Recording outcomes

After completing the smoke gate, update `project-planning/workflow/run-20260516T194651Z.json`:

```json
"smoke_outcomes": {
  "m_publish-1": { "verdict": "...", "caveats": "..." },
  "m_publish-2": { "verdict": "...", "caveats": "..." },
  "m_publish-3": { "verdict": "...", "caveats": "..." },
  "m1": { "verdict": "..." },
  "m3": { "verdict": "..." }
}
```

A `deferred` on any m_publish gate is a `WARN` — it **blocks `/ship`** until resolved.
