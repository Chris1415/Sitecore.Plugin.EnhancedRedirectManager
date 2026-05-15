# Smoke checklist — Live walkthrough (m5)

> T067 / T056 — A ≥5-minute unscripted exploration of the Redirect Manager across all three extension points.
> Success metric **m5**: zero unrecoverable errors, smooth flow between surfaces, operator can complete realistic tasks without consulting docs.

This is the "human gate". Run after `smoke-crud` and `smoke-import-export` have passed. Goal: catch UX paper-cuts and edge cases that the focused checklists miss.

## PRD-002 V4 additions

### Pre-flight (PRD-002 specific)

- [ ] Both prior smoke checklists (`smoke-crud.md` including PRD-002 additions, `smoke-import-export.md`) are **PASS**.
- [ ] Browser dev console open (F12) the whole time.

## Pre-flight

- [ ] Both prior smoke checklists are **PASS**.
- [ ] Operator has not seen the app in the last 24h (or, easier: hand the tenant URL to a colleague who hasn't touched the project).
- [ ] Browser dev console open (F12) the whole time. Console must remain quiet for an m5 pass — any uncaught exception is an immediate fail.

## The walkthrough — 5 minutes minimum (PRD-002 V4 script)

Set a timer for 5 minutes. Don't follow a strict script. The operator pretends to be a real Sitecore author who needs to manage redirects for a launching campaign. The PRD-002 script has more stops than the PRD-000 version — feel free to cut steps if the session already covers the intent.

Suggested journey (deviate freely):

### Minute 1 — Full Page V4 chrome tour

- Open **Cloud Portal launcher** → **Redirect Manager**.
- Operator gets oriented: V4 redesign should be immediately visible — frosted topbar, workspace hero zone with headline and stat strip, plume backdrop (if reduced-motion OFF).
- Confirm: **Preview Data banner** visible at the top of the Full Page. Read it — does it explain which metrics are mocked?
- Pick a collection, then a site. Redirect maps list appears in the left rail with frosted-glass card chrome.
- Click a map → detail pane opens on the right.
- **Operator probe (m5 key check):** "Tell me which numbers on this Full Page are real vs. preview data." Operator should be able to answer correctly by reading the banner and the "Preview data" label on the stat strip tiles.

### Minute 2 — Context Panel (inline form efficiency)

- Switch to **Pages** for the same site.
- Open any page → side-panel context dropdown → **Redirects**.
- Operator sees Context Panel: V4 hero count header at the top ("N redirects point here"), then the inline `QuickRedirectForm` — **no button needed to reveal the form**.
- If the current page has matching redirects, they appear in the list below the form.
- Operator uses the inline form to add a redirect for the current page. No modal. Fill source + target → Add. Toast confirms.
- **Compare efficiency:** The inline form (PRD-002) should feel noticeably faster than the PRD-000 modal flow.

### Minute 3 — Dashboard Widget preview data check

- Open **Cloud Portal Dashboard** for the same site.
- Operator looks at the **Redirects summary** widget.
- **Operator probe:** "Which of these numbers are real, and which are preview data?" Operator should be able to identify the 3 real count tiles (maps / mappings / last-updated) vs. the mock tiles (sparkline, delta, top-destinations, recently-shipped, author attribution) by reading the Preview Data banner.
- Confirm: real count tiles updated based on what the operator just did (new redirect added in Minute 2 should be reflected in the mappings count).

### Minute 4 — Back to Full Page (CRUD under V4 chrome)

- Re-open **Redirect Manager** full-screen.
- Operator picks a different site and verifies picker chain works.
- Picks a map and tries inline mapping edit — add, edit, delete a row.
- Tries the rename flow (click map name → type → blur).
- Tries the per-row dedup error.
- Opens `NewRedirectMapModal` (re-skinned) — confirm V4 dialog chrome (frosted overlay, correct heading, no `Active`/`Draft` labels).

### Minute 5 — Light/dark + reduced-motion verification

- If theme switcher is enabled (`NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER=true`), flip between Light / Dark / System modes.
  - Dark mode: gradient text still readable; plume backdrop still visible; no white-on-white badges.
  - Light mode: frosted glass surfaces readable; hero stat strip legible.
- Enable reduced-motion (OS or Chrome DevTools):
  - Plume backdrop becomes static (no drift).
  - Count-up numbers on Dashboard Widget hero and stat strip jump to final value immediately.
  - Letter-reveal on Full Page hero shows text immediately (no stagger).
  - Hover lifts on cards are suppressed (no translateY on hover).
- Click **Export → Copy to clipboard**. Paste into text editor — JSON is well-formed.

## Things to watch for (qualitative)

| Concern | Pass if … |
|---------|-----------|
| **Console hygiene** | No uncaught errors, no warnings stacking up on each navigation |
| **Loading states** | Every async operation has a visible loading state (skeleton, "Saving…", progress bar); operator never wonders "did it work?" |
| **Toast feedback** | Every write has either a success toast or a clear error toast — no silent failures |
| **Empty states** | Every "no data" state has clear copy directing the next action |
| **Responsive layout** | Resize the browser window narrow (< 960px) — Full Page swaps to tabs cleanly |
| **Keyboard navigation** | Tab order is logical through pickers, list, detail form. No focus traps |
| **Dark mode** | If switcher enabled: no white-on-white, no invisible icons, no contrast failures |
| **Iframe collisions** | Cloud Portal chrome (close button, fullscreen affordance) doesn't visually overlap with our content |
| **Sonner toasts** | Toast position doesn't cover important UI; multiple toasts stack readably |

## Outcome

- [ ] **PASS** — m5 success metric met. Record `smoke_outcomes.live_walkthrough: pass`.
- [ ] **PASS WITH CAVEATS** — minor UX nits, file as follow-up tasks but don't block ship.
- [ ] **FAIL** — at least one unrecoverable error (uncaught exception, broken state, data loss). Block ship until fixed.

## Notes for the operator

Capture any quirks you notice — even ones that don't fail the smoke — in `project-planning/workflow/friction-log-{run-id}.md`. They become the polish list for PRD-001.
