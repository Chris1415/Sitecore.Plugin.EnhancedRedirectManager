# Smoke checklist — Import / Export round-trip (m4)

> T066 — Real-tenant verification of the JSON export and 4-step import wizard.
> Success metric **m4**: complete a full export → modify → import cycle with **zero rule loss** (modulo the newly-minted GUID caveat documented in ADR-0009).

This is the most diff-heavy smoke. **Run against a non-production tenant** — the wizard mutates real items.

## Pre-flight

- [ ] CRUD smoke (`docs/smoke-crud.md`) has passed.
- [ ] Target site has at least 3 Redirect Maps with ≥1 mapping each (so the export has meaningful content).
- [ ] Note the current count of Redirect Maps and total mapping rows. You'll cross-check at the end.

## Step 1 — Export (m4 prerequisite)

### Open in new tab path

- [ ] Full Page → top-right **Export** dropdown → **Open in new tab**.
- [ ] A new tab opens showing the JSON envelope.
- [ ] The JSON has `"schema": "redirect-manager/v1"`, an `exportedAt` ISO timestamp, and `items: [...]` with one entry per Redirect Map.
- [ ] Each item has: `id`, `name`, `redirectType`, `preserveQueryString`, `preserveLanguage`, `includeVirtualFolder`, `updatedAt`, `mappings: [...]`.
- [ ] **Pass:** JSON validates against the schema, item count matches the left-rail list.

### Clipboard path

- [ ] **Export** dropdown → **Copy to clipboard**.
- [ ] Toast says `Copied N maps to clipboard` with byte count.
- [ ] Paste into a text editor. JSON is identical to the new-tab payload (modulo `exportedAt` timestamp).
- [ ] **Pass:** clipboard write succeeded.

### Download grayed-out

- [ ] **Export** dropdown shows **Download** as grayed-out with `Soon` badge.
- [ ] Clicking it does nothing (and shouldn't crash).
- [ ] **Pass:** UI signals coming-soon clearly.

**Save the exported JSON** to a local file — call it `baseline.json`. You'll use it as the canonical "before" snapshot.

## Step 2 — Modify the JSON

Make a small set of deterministic changes you can verify on import:

- [ ] **Rename one map** — change one item's `name` to `renamed-by-import-smoke`.
- [ ] **Change one redirectType** — flip an item from `ServerTransfer` to `Redirect301`.
- [ ] **Toggle one flag** — change one item's `preserveQueryString` from `false` to `true`.
- [ ] **Add a mapping row** — pick one item, append `{"source": "/import-test", "target": "/import-target"}` to its `mappings` array.
- [ ] **Remove a mapping row** — pick another item, delete one entry from its `mappings` array.
- [ ] **Change a mapping target** — pick a third item, change one mapping's `target` (keep its `source` the same).
- [ ] **Add a brand-new item** — append a new `{ id, name, ... mappings }` object with a UUID-shaped `id` that doesn't exist in the tenant. Call it `import-smoke-new-{timestamp}`.

Save as `modified.json`.

## Step 3 — Import

- [ ] Full Page → top-right **Import** button.
- [ ] Wizard opens at the **Upload** step.

### Step 3a — Upload

- [ ] Click the file picker and select `modified.json`.
- [ ] _OR_ paste the JSON into the textarea and click **Validate & preview**.
- [ ] **Pass:** wizard advances to the Preview step. No error banner.

### Step 3b — Preview classification

You should see 7 rows (6 modified + 1 new):

| Item | Expected classification |
|------|------------------------|
| Renamed item | **conflicting** (name differs) |
| RedirectType changed | **conflicting** (redirectType differs) |
| Flag toggled | **conflicting** (preserveQueryString differs) |
| Mapping added | **conflicting** (mappings differs) |
| Mapping removed | **conflicting** (mappings differs) |
| Mapping target changed | **conflicting** (mappings differs) |
| New item | **new** |

- [ ] Count badges at the top match: 1 new / 6 conflicting / (remaining count) unchanged.
- [ ] **Pass:** classification matches expectations.

### Step 3c — Drill-down (conflict detail)

For each conflicting row:

- [ ] Click the chevron (▶) to expand.
- [ ] **Field changes** section lists the differing scalar field(s) with `current → incoming` values.
- [ ] **Mapping changes** section (where mappings differ) shows the correct buckets:
  - `+` rows for added mappings
  - `−` rows for removed mappings
  - `~` rows for changed targets (with both currentTarget and incomingTarget)
- [ ] Legend below the list shows `+ add · − remove · ~ change`.
- [ ] **Pass:** every diff bucket matches the changes you made in `modified.json`.

### Step 3d — Action resolution

Defaults:

- `new` rows → action `create`
- `conflicting` rows → action `skip` (operator must opt in to overwrite)
- `unchanged` rows → fixed `skip` (no dropdown)

- [ ] Leave the **new** row's action at `create`.
- [ ] Change **3 of the 6 conflicting** rows to `overwrite`. Leave the other 3 as `skip`.
- [ ] Click **Apply**.

### Step 3e — Applying

- [ ] Progress bar advances; current item name shown.
- [ ] Sequential — no flickering or out-of-order items.
- [ ] **Pass:** progress reaches 100%.

### Step 3f — Summary

- [ ] Totals show: **1 created · 3 overwritten · 3 skipped · 0 failed**.
- [ ] An info banner appears: "1 item was created with a new server-minted GUID (the source GUID couldn't be preserved — this is an Authoring API constraint)" — see ADR-0009.
- [ ] Per-item table shows the new item with `New ID: …` — the server-minted GUID, different from the one in `modified.json`.
- [ ] **Pass:** counts match your choices, GUID-mint warning surfaces correctly.

## Step 4 — Cross-verification

- [ ] Close the wizard. Left-rail list refreshes.
- [ ] The 3 items you overwrote reflect the changes from `modified.json`:
  - Renamed item shows `renamed-by-import-smoke` in the list.
  - RedirectType-changed item shows the new chip.
  - Flag-toggled item has the right flag state in the detail pane.
- [ ] The 3 items you skipped are unchanged from before the import.
- [ ] The new item `import-smoke-new-…` appears in the list with its newly-minted ID.

- [ ] **Open Content Editor** to verify Sitecore-side persistence. Same checks as smoke-crud step 7.

## Step 5 — Re-import the SAME modified.json

Run the import wizard again, same file. This tests the ADR-0009 caveat: caller-supplied GUIDs are NOT preserved, so re-importing always creates duplicates for "new" items.

- [ ] Wizard opens, classifies the new item as **new** again (its source GUID doesn't match the server-minted one).
- [ ] Apply with default actions.
- [ ] Summary shows 1 created (a fresh duplicate). Warning banner re-appears.
- [ ] **Expected:** Two items now exist with the name `import-smoke-new-…`. This is the documented caveat — surface as a known limitation, not a bug.

## Step 6 — Clean up

- [ ] Delete the imported items via Full Page or Content Editor.
- [ ] Revert any overwritten items if needed (use `baseline.json` to spot the differences).

## Outcome

- [ ] **PASS** — `smoke_outcomes.import_export_round_trip: pass`
- [ ] **PASS WITH CAVEATS** — ADR-0009 GUID-mint behaviour is expected, not a fail
- [ ] **FAIL** — record details and block ship
