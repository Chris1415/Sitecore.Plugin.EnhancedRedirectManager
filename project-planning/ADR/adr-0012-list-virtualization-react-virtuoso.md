# ADR-0012: List virtualization — `react-virtuoso`

## Status

Accepted

## Context

PRD-000 NFR-S1 caps MVP scale at ~500 mappings across ~30 Redirect Map items per site. NFR-P2 commits the Full Page redirect list to render in ≤2 seconds after site selection. PRD § 9 marks **light virtualization** as acceptable; PRD OQ-6 leaves the specific library / primitive choice open for architecture.

The Full Page's list pane renders one collapsible row per Redirect Map item (PRD US-6). Inside each expanded row, mappings render as a row list (PRD US-8). At the typical scale (30 items × 16 mappings average) virtualization is not strictly required; at the upper bound (30 items × ~50 mappings if uneven distribution) the inner mapping lists benefit. The Context Panel's grouped match list sits well below 500 rows in any realistic case — virtualization there is overkill.

**Library candidates:**

- `react-virtuoso` — small (~30 KB), unopinionated, supports variable-height rows, dynamic `aria-rowindex` for screen readers (NFR-A3), Blok-compatible primitives confirmed via `marketplace-sdk-blok-integration` skill catalog (Tables wrapped in `scroll-area` are recommended; `react-virtuoso` works inside that pattern).
- `react-window` / `react-virtualized` — older lineage; `react-window` is smaller but assumes fixed row height by default (variable-height is a separate API path); accessibility story is less polished out of the box.
- `@tanstack/react-virtual` — headless; powerful but requires more wiring; overkill for MVP.
- Hand-rolled (`useEffect` + `IntersectionObserver`) — worst option; reinvents accessibility wheels.

A spike against the upper bound (500 rows, 1024px iframe width, Blok styling) is captured as architecture deliverable but is not a blocker for the ADR — `react-virtuoso` has been used in similar Sitecore Marketplace contexts (Component Usage Atlas POC patterns) without issue.

## Decision

The Full Page uses **`react-virtuoso`** for the redirect-list pane and the inner mapping lists. The Context Panel and Dashboard Widget do **not** virtualize — their content is structurally bounded.

The implementation uses the default `<Virtuoso>` component for the outer Redirect Map list (variable-height rows because each item has a header + optional expanded mapping list) and `<Virtuoso>` again inside an expanded item for the mapping rows. `aria-rowindex` and `aria-rowcount` are populated automatically by the library; the Full Page wraps the virtual list in a Blok `scroll-area` per `marketplace-sdk-blok-integration` § "Iframe viewport constraints".

Closes PRD OQ-6.

## Consequences

**Easier:**

- Variable row heights work without extra plumbing — the parent Redirect Map row has a different height when collapsed vs expanded, and `react-virtuoso` handles that out of the box.
- Accessibility (NFR-A1, NFR-A3) — built-in `aria-rowindex` / `aria-rowcount` plus library-managed focus on scroll keep keyboard navigation working without per-component wiring.
- Bundle impact is small (~30 KB gzip) — well within the "fast first paint" Marketplace constraint (`marketplace-sdk-blok-integration` § "Iframe viewport constraints").
- One library covers both the outer list and the inner mapping lists — no library proliferation.

**Harder:**

- A new dependency the project must track. Mitigated by `react-virtuoso`'s small surface area and stable API (the library has been on v4 for several years).
- The Full Page list pane needs a fixed-height container (Blok `scroll-area` provides this) for `react-virtuoso` to render correctly. UI design must respect this constraint when picking variants — variant proposals that try to fit-content the list pane will fight virtualization.
- If a future PRD raises NFR-S1 to thousands of mappings per site, performance under `react-virtuoso` should be re-measured — the working assumption is that 500-row scale is comfortable; 5000+ is not validated.

## Date

2026-05-10
