# Smoke checklist — m5 live walkthrough (PRD-002)

> T056 — ≥5-minute operator session across all redesigned surfaces.
> Success metric **m5**: zero unrecoverable errors; operator can identify which metrics are real vs. preview data; V4 chrome confirmed on all surfaces.

## Pre-flight

- [ ] Smoke checklists m2 (`m2-host-frame-smoke-checklist-prd002.md`) and m3 (`smoke-crud.md` including PRD-002 additions) are **PASS**.
- [ ] m4 (`smoke-import-export.md`) is **PASS**.
- [ ] Browser dev console open (F12) the whole time. Any uncaught exception is an immediate fail.
- [ ] Operator has not seen the redesigned app in the last 24 h (fresh eyes preferred), or hand to a colleague who hasn't touched the project.

## The walkthrough — 5+ minutes

Set a timer for 5 minutes minimum. The operator plays the role of a Sitecore author launching a new campaign. The walkthrough must cover all 3 redesigned surfaces and validate the Preview Data discoverability.

---

### Stop 1 — Full Page (2 min)

- [ ] Open **Cloud Portal launcher** → **Redirect Manager**.
- [ ] V4 redesign is immediately apparent: frosted topbar, workspace hero, plume backdrop (if motion enabled).
- [ ] Preview Data banner is visible at the top. **Operator reads it.**
- [ ] **KEY PROBE:** The operator should be able to answer: *"Which numbers on this Full Page are real, and which are preview data?"*
  - Expected: the 4 stat-strip tiles (mappings total, 301 count, 302 count, conflicts) are labelled preview; the map list and detail-pane data (map names, mapping rows) are real.
  - Record operator's answer: _______________
  - [ ] **PASS** — operator correctly identifies real vs. preview data via the banner and tile labels
- [ ] Pick a collection → site → map. Detail pane opens.
- [ ] Add a mapping via the inline mappings table → toast confirms.
- [ ] Console: no errors.

---

### Stop 2 — Context Panel (1.5 min)

- [ ] Switch to **Pages** for the same site.
- [ ] Open any page → side-panel dropdown → **Redirects**.
- [ ] Context Panel loads with V4 hero count header ("N redirects point here").
- [ ] Inline `QuickRedirectForm` is visible without clicking any button.
- [ ] **Efficiency observation:** Operator notes whether the inline form feels faster than a modal flow.
- [ ] Use the inline form to add a redirect for the current page. Record steps taken: _______________
- [ ] Toast confirms. New row appears in the matched list.
- [ ] No Preview Data banner on Context Panel.
- [ ] Console: no errors.

---

### Stop 3 — Dashboard Widget (1 min)

- [ ] Open **Cloud Portal Dashboard** for the same site.
- [ ] Dashboard Widget shows V4 redesign: hero stat number + sparkline + tiles + top-destinations + recently-shipped + footer attribution.
- [ ] Preview Data banner is visible above the hero stat.
- [ ] **KEY PROBE:** *"Which numbers on the Dashboard Widget are real, and which are preview data?"*
  - Expected: the 3 count tiles (maps / mappings / last-updated) are real; the hero stat number (+412 delta), sparkline, top-destinations, recently-shipped count, author attribution, and "all healthy" badge are preview data.
  - Record operator's answer: _______________
  - [ ] **PASS** — operator correctly identifies real vs. preview data
- [ ] The mappings count in the real tiles should reflect the mapping added in Stop 1.
- [ ] Console: no errors.

---

### Stop 4 — Light/dark + reduced-motion (0.5 min)

- [ ] If theme switcher enabled: toggle Light → Dark → System.
  - [ ] Dark mode: gradient text readable, plume visible, no white-on-white
  - [ ] Light mode: frosted surfaces readable, stat strip legible
- [ ] Enable reduced-motion (DevTools: Rendering → `prefers-reduced-motion: reduce`):
  - [ ] Full Page: plume backdrop static (no drift)
  - [ ] Full Page: count-up numbers jump to final value immediately
  - [ ] Full Page: hero headline text shows without per-character stagger
  - [ ] Dashboard Widget: hero stat number jumps immediately
  - [ ] All hover lifts: cards do not translateY on hover

---

## Qualitative observations

| Concern | Pass if … |
|---------|-----------|
| Console hygiene | No uncaught errors, no stacking warnings on navigation |
| Loading states | Every async operation shows a skeleton or "Saving…" indicator |
| Toast feedback | Every write has a success or error toast — no silent failures |
| Empty states | "No data" states have clear copy and a next action |
| Preview Data discoverability | Operator can identify preview vs. real metrics without consulting docs |
| Inline form efficiency | Adding a redirect from Context Panel requires fewer steps than PRD-000 modal |
| V4 chrome fidelity | Frosted glass, gradient text, plumes match POC visual reference |
| Iframe collisions | Cloud Portal chrome doesn't overlap with Redirect Manager content |

---

## Outcome

- [ ] **PASS** — zero unrecoverable errors; operator correctly identifies preview vs. real data; V4 chrome confirmed. Record `smoke_outcomes.live_walkthrough: pass`.
- [ ] **PASS WITH CAVEATS** — minor UX nits (note below); no unrecoverable errors. Record `pass_with_caveats`.
- [ ] **FAIL** — unrecoverable error OR operator cannot distinguish preview vs. real data even after reading the banner. Record `fail` + block ship.

### Caveats / nits observed

(fill in during walkthrough)

---

## Notes for the operator

Capture any UX friction in `project-planning/workflow/friction-log-{run-id}.md`. Even non-blocking issues are valuable input for the next iteration. The Preview Data discoverability probe is a first-class success criterion for PRD-002 — if the operator cannot answer the "real vs. preview" question, the banner copy or placement needs revision before ship.
