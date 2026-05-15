# Smoke checklist — CRUD round-trip (m3)

> T065 — Real-tenant verification of the Redirect Manager CRUD surface.
> Success metric **m3**: complete one full CRUD cycle in under 10 seconds.
> PRD-002 additions: inline QuickRedirectForm, create-new-map auto-name, multi-match dropdown, re-skinned modals.

This checklist is run inside Cloud Portal against a registered tenant. **Do not run against a production tenant — create / delete operations are destructive.**

## Pre-flight

- [ ] App registered per `docs/registration.md`.
- [ ] Operator has Author or Designer role on the target site.
- [ ] At least one existing Redirect Map item under `/sitecore/content/{collection}/{site}/Settings/Redirects` (so the create flow can discover the template GUID — see `lib/sdk/redirects-discover.ts`).
- [ ] Browser dev console open (F12) so console errors surface immediately.

## Round-trip — every operation in one session

Run this end-to-end. Stopwatch starts the moment you click the first button.

### 1. Read

- [ ] Open Cloud Portal launcher → **Redirect Manager** (Full Page).
- [ ] Pick a collection from the left-rail dropdown.
- [ ] Pick a site from the next dropdown.
- [ ] Redirect maps list appears under "Redirect maps". Pick one.
- [ ] Right pane shows the map's name, RedirectType chip, flag toggles, last-updated, mappings table.
- [ ] **Pass:** no console errors, all data renders, no infinite loading state.

### 2. Create

- [ ] Click **+ New map** (top-right).
- [ ] Modal opens; discovery resolves (parent + template GUIDs).
- [ ] Fill Name: `smoke-test-{timestamp}`. Pick RedirectType `301 Permanent`. Toggle one flag.
- [ ] Click **Create**.
- [ ] Toast says `Created "smoke-test-…"`. Modal closes. New item appears in the left rail and is auto-selected in the right pane.
- [ ] **Pass:** create completes, item appears, no errors.

### 3. Update — field-level

- [ ] Click the map name → inline rename → type `smoke-test-renamed` → press Enter (or blur).
- [ ] Toast says `Renamed to "smoke-test-renamed"`. Name updates in left rail.
- [ ] Change the RedirectType dropdown to `302 Found`.
- [ ] Toast says `Type updated`.
- [ ] Toggle one of the three flag checkboxes.
- [ ] Toast says `Preserve query string on/off` (or matching field).
- [ ] **Pass:** all three writes complete, toasts confirm, no console errors.

### 4. Update — mappings table

- [ ] Click **Add mapping** at the bottom of the table.
- [ ] Inline row appears. Source: `/smoke-old`. Target: `/smoke-new`. Press Enter on Target.
- [ ] Toast says `Mapping added`. Row appears in the table.
- [ ] Hover the new row → click the pencil icon → edit target to `/smoke-new-2` → press Enter.
- [ ] Toast says `Mapping updated`.
- [ ] Hover the same row → click the trash icon.
- [ ] Toast says `Mapping deleted`. Row disappears.
- [ ] **Pass:** add / edit / delete each one-shot, toast each time.

### 5. Duplicate detection

- [ ] Click **Add mapping** → source `/smoke-old` (already-existing source from step 4) → target anything.
- [ ] Toast says `A mapping with source "/smoke-old" already exists`. Row not added.
- [ ] **Pass:** client-side dedup catches the duplicate before the server silently absorbs it.

### 6. Delete

- [ ] Click the trash button in the detail-pane header.
- [ ] AlertDialog opens with the map name + mapping count.
- [ ] Click **Delete**.
- [ ] Toast says `Deleted "smoke-test-renamed"`. Detail pane returns to empty state. Item removed from left rail.
- [ ] **Pass:** delete completes, list refreshes, selection cleared.

### 7. Stopwatch

- [ ] **Total elapsed time:** _____ seconds.
- [ ] **m3 pass:** total under 10 seconds (excluding network blips on slow tenants — re-run if a single roundtrip stalled).

## Cross-pane verification

After the round-trip:

- [ ] Open the same site in **Content Editor** (or any other Sitecore content tool).
- [ ] Navigate to `/sitecore/content/{collection}/{site}/Settings/Redirects`.
- [ ] The `smoke-test-renamed` map you deleted should be gone.
- [ ] Any other maps you added mappings to should reflect those mappings.
- [ ] **Pass:** edits are persisted in Sitecore — not just in the UI's local state.

## Failure modes worth flagging

If anything below happens, record details and triage **before** ship:

| Symptom | Likely cause |
|---------|--------------|
| Modal stays open after Create | `handleOpenChange(false)` not reached — check for thrown error in console |
| Toast says success but item didn't appear | Server returned `result.ok=true` but list didn't refresh — verify `listRefreshKey` bump |
| Console error `400 Bad Request` from Authoring GraphQL | Envelope shape regressed — refer to memory `reference_sitecore_authoring_write_envelopes` |
| Discovery missing-template error | No existing Redirect Map under the site — seed one in Content Editor first |

## PRD-002 V4 additions

These items extend the base CRUD round-trip with PRD-002-specific flows. Run after the steps above.

### A. Inline QuickRedirectForm (Context Panel — US-R5)

- [ ] Open the Pages editor → side-panel dropdown → **Redirects**.
- [ ] The inline `QuickRedirectForm` is visible **without clicking any button** — it is always-on in the Context Panel.
- [ ] Source field is pre-populated with the current page path (read-only or editable depending on the selected map's RedirectType).
- [ ] **Add to existing map:** select a redirect map from the multi-match dropdown → fill Target → press **Add**. Toast confirms. Row appears in the matched list.
- [ ] **Create new map (auto-name):** with no existing maps, the form's "Create new map" path triggers. Verify the auto-generated map name matches the pattern `{pageSlug}-redirects` (e.g. page `/products/new-item` → map name `new-item-redirects`).
- [ ] **Pass:** inline form flow works end-to-end; no modal is needed for the primary add-redirect path.

### B. Multi-match dropdown

- [ ] Navigate to a Pages page that has redirects in MORE than one Redirect Map.
- [ ] The Context Panel displays a dropdown above the form to select which map to add to.
- [ ] Selecting a different map updates the form's target label to reflect the selected map's `RedirectType`.
- [ ] **Pass:** dropdown renders with all matching maps; selection is reflected in the form.

### C. Toast appearance on success (PRD-002 surfaces)

- [ ] Create a redirect via the inline form → toast appears (Sonner) within 2 seconds.
- [ ] Delete a redirect map via the Full Page **Delete map** confirm modal → toast appears.
- [ ] New Redirect Map via `NewRedirectMapModal` (re-skinned in V4) → modal opens with V4 chrome → create succeeds → toast appears.
- [ ] Import via `ImportRedirectMapModal` (re-skinned) → wizard navigable with V4 chrome.
- [ ] `DeleteMapConfirmModal` (re-skinned) → confirm dialog opens → delete confirmed → toast appears.
- [ ] **Pass:** all modal flows use V4 dialog chrome; toasts surface for every write.

### D. Preview Data banner must NOT interfere with CRUD

- [ ] On Full Page, the Preview Data banner is visible at the top. Verify it does NOT block or overlap any map-list row, the topbar actions (Import / Export / New map), or the detail pane.
- [ ] On Dashboard Widget, the Preview Data banner is visible. Verify the real count tiles are still accessible.
- [ ] **Pass:** banners are informational only; no CRUD affordance is occluded.

## Outcome

- [ ] **PASS** — record in run manifest `smoke_outcomes.crud_round_trip: pass`
- [ ] **PASS WITH CAVEATS** — note any UI quirks under `smoke_outcomes.crud_round_trip.notes`
- [ ] **FAIL** — `smoke_outcomes.crud_round_trip: fail` + paste console error + ship is blocked
