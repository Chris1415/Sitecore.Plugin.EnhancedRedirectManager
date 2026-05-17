# ADR-0032: Per-map Publish placement — icon button at row end

## Status

Accepted (resolves PRD-003 OQ-P5)

## Context

PRD-003 (US-P2, AC-P2.1) adds a per-map "Publish" action to every Redirect Map row in the rail (`site/components/full-page/RedirectMapList.tsx`). The PRD leaves the placement to /architect and explicitly enumerates three options in § 11 UX Considerations:

1. **Icon button** — small action to the right of the existing row content (after the type Badge).
2. **Overflow menu item** — add a 3-dots menu to the row that contains "Publish".
3. **Row-end action** — full button with text label at the row end.

A direct read of `RedirectMapList.tsx` (lines 187–219) reveals the current per-row layout:

```
[ dot ]  [ name + meta (mappings·updated) ]                     [ RedirectType Badge ]
```

Every row is one click target (the entire row triggers `onSelect(map)` — `onClick={() => onSelect(map)}` at line 202). Edit and delete actions live on the **detail pane** (`RedirectMapDetail.tsx`) — confirmed by PRD prd-minimal-003 "Key constraints" and visible in the component: there is **no existing per-row action affordance** to inherit (no overflow menu, no edit icon, no delete icon). The row is a pure "select-me" target with a left stripe accent when selected.

The rail uses `react-virtuoso` (ADR-0012) — the row is a virtualized list item, so the action must be a static DOM element (no portal nesting that would break virtualization). The visual budget for the row is tight: 2.5 vertical units of padding (`py-2.5`) and a single horizontal flex axis with `justify-between`. Existing visual elements: dot + 2-line text block + 1 Badge.

The V4 Blok Elevated aesthetic (ADR-0024) treats each row as a card (`elev-card` class, line 195) with hover lift; introducing a heavier full-button action at row end would compete with both the existing Badge and the selected-state left-stripe accent. An overflow menu would introduce a new interaction pattern that does not exist anywhere else in the rail, costing operators a "what's this 3-dots for?" beat at first encounter.

Three options reconsidered against this evidence:

- **Option 1 (icon button)** — single small action, fits next to the Badge, no new interaction pattern, fire-and-forget click is a natural icon-button affordance. Per-map Publish is fire-and-forget by PRD design (US-P2 AC-P2.2: no confirmation dialog) so a single click on a small target is appropriate. The icon doubles as the "publishing…" indicator (AC-P2.6: button spinner / icon swap).
- **Option 2 (overflow menu)** — adds a new interaction pattern for a single item. Operators must learn the menu before they can publish. Adds an extra click. Overhead is justified only when 3+ row-level actions exist; today there is exactly 1 (Publish).
- **Option 3 (full button)** — heaviest visual weight, competes with Badge, pushes Badge inboard or wraps the row. Breaks the rail's "card with single accent badge" visual rhythm.

## Decision

**Option 1: icon button at row end.** The per-map Publish action renders as a small icon button placed **immediately to the right of the existing `RedirectType` Badge** in each `RedirectMapList` row.

Specifics:

- **Icon**: a Lucide `Send` or `UploadCloud` glyph (UI Designer / implementor picks the closer match; both are existing Lucide imports already used elsewhere in this app, e.g. `RefreshCw`, `History`). Size `h-3.5 w-3.5` to match the `WorkspaceHero` Button icon scale (line 154 reference).
- **Wrapper**: an `<button type="button">` with `aria-label="Publish <map name>"` for screen-reader clarity. Visually a Blok `Button` with `variant="ghost"` and `size="icon"` (or the closest Blok icon-button primitive available — implementor confirms during /implement).
- **Click handler**: `onClick={(e) => { e.stopPropagation(); publishMap(map); }}` — the `stopPropagation` is mandatory so clicking Publish does NOT also trigger the row's `onSelect`.
- **In-flight state**: between click and response, the icon swaps to a spinning loader glyph (e.g. `Loader2` with `animate-spin`) and the button is `disabled` (NFR-P6 idempotency guard). On response, the icon swaps back.
- **Tooltip**: title attribute "Publish map" on hover (Blok tooltip primitive if available; otherwise native `title`).
- **Theme parity**: ghost variant honors dark / light / system tokens automatically — no new color decisions.
- **Selected row** still shows the left-stripe accent unchanged; the icon button sits on the same row line, the Badge is unmoved.

Row layout after this ADR:

```
[ dot ]  [ name + meta ]                       [ RedirectType Badge ] [ icon Publish ]
```

The icon button is the FIRST per-row action ever introduced in `RedirectMapList`. If a future PRD adds a second per-row action (e.g. "Duplicate", "Validate"), the **second action triggers a re-evaluation** — at 2+ row actions, an overflow menu (Option 2) becomes the right answer and this ADR is superseded.

## Consequences

**Easier:**

- Single-click fire-and-forget Publish — matches PRD-003 US-P2 UX intent (no confirmation, no menu detour) most directly.
- No new interaction pattern introduced — operators see an icon, click it, get a toast. Same surface area as any other icon button in the app.
- Virtualization-safe — pure DOM element inside the row, no portal, no menu state that would have to be managed across `react-virtuoso` row recycling.
- Minimal visual weight — the icon's footprint is ~16px wide; the row's existing rhythm is preserved. V4 elevation aesthetic intact.
- `stopPropagation` + idempotency guard are both straightforward to wire — well-known patterns.
- The in-flight icon swap doubles as the loading state (AC-P2.6) — no separate spinner overlay needed.

**Harder:**

- Icon-only buttons rely on `aria-label` for screen-reader meaning. The implementor MUST set it per-row with the map name (e.g. `aria-label="Publish Homepage Redirects"`) so the assistive-tech announcement is unambiguous. PR review checks this.
- The icon's meaning is not obvious without the tooltip — operators on first encounter may hover to confirm before clicking. Mitigation: tooltip on hover; the toast on click confirms the action started.
- If a future PRD adds bulk multi-select Publish (in the rail), the per-row icon button has to coexist with a row checkbox. Layout still works (checkbox at row start, icon at row end), but the row gets denser. Acceptable at 2 actions; revisit at 3.
- The icon button increases the row's interactive surface from 1 click target to 2. `e.stopPropagation()` is mandatory; missing it would cause a Publish click to also select the map (annoying but not data-corrupting). PR review enforces.

**Neutral:**

- This ADR does NOT affect the `WorkspaceHero` "Publish Site" CTA (that is the existing hero CTA position, just relabeled — see PRD § 11).
- This ADR does NOT change the rail's selected-state styling, header copy, or virtualization.
- The icon button's `data-*` attributes can carry a stable selector for QA (e.g. `data-action="publish-map"`) — implementor decides; no ADR mandate.

## Date

2026-05-16
