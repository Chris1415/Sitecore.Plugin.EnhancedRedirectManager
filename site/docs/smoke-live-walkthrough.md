# Smoke checklist — Live walkthrough (m5)

> T067 — A ≥5-minute unscripted exploration of the Redirect Manager across all three extension points.
> Success metric **m5**: zero unrecoverable errors, smooth flow between surfaces, operator can complete realistic tasks without consulting docs.

This is the "human gate". Run after `smoke-crud` and `smoke-import-export` have passed. Goal: catch UX paper-cuts and edge cases that the focused checklists miss.

## Pre-flight

- [ ] Both prior smoke checklists are **PASS**.
- [ ] Operator has not seen the app in the last 24h (or, easier: hand the tenant URL to a colleague who hasn't touched the project).
- [ ] Browser dev console open (F12) the whole time. Console must remain quiet for an m5 pass — any uncaught exception is an immediate fail.

## The walkthrough — 5 minutes minimum

Set a timer for 5 minutes. Don't follow a script. The operator pretends to be a real Sitecore author who needs to manage redirects for a launching campaign.

Suggested journey (deviate freely):

### Minute 1 — Discovery

- Open **Cloud Portal launcher** → **Redirect Manager**.
- Operator gets oriented: picks a collection, then a site, sees a list of existing redirect maps.
- Clicks a map → reads its detail in the right pane.

### Minute 2 — Pages context

- Switch to **Pages** for the same site.
- Open any page → side-panel context dropdown → **Redirects**.
- Operator sees Context Panel inside Pages. If the current page has matching redirects, the matched maps show their relevant rows. If not, the empty state with the "+ Add redirect" button appears.
- Operator adds a redirect for the current page using the modal.
- Modal closes, toast confirms, the new row appears in the panel.

### Minute 3 — Dashboard at a glance

- Open **Cloud Portal Dashboard** for the same site.
- Operator looks at the **Redirects summary** widget tile.
- Three numbers visible: total maps, total mappings, last-updated.
- Numbers feel right given what the operator just did in steps 1–2 (the count should have ticked up).

### Minute 4 — Back to Full Page

- Re-open **Redirect Manager** full-screen.
- Operator picks a different site and verifies the picker chain works (collection change clears site + map).
- Picks a map and tries the inline mapping edit flow — add, edit, delete a row.
- Tries the rename flow (click map name → type → blur).
- Tries the per-row dedup error (re-add a source that already exists). The error toast surfaces.

### Minute 5 — Export and dark mode

- Click **Export → Copy to clipboard**.
- Open a text editor and paste — verify the JSON looks well-formed.
- If the theme switcher is enabled (`NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER=true`), flip between Light / Dark / System modes. Check that nothing breaks contrast, no white-on-white badges, no broken icons.

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
