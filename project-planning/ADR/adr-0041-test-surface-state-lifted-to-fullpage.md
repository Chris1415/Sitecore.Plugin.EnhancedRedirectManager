# ADR-0041: Lift Test-surface state (`lastTrace`, `activeTab`) up to `FullPage`; plain props + forwardRef imperative handle for the deep-link

## Status

Accepted

## Context

PRD-004 adds a "Test" tab on the Full Page workspace alongside the existing "Manage" tab. Two interaction patterns force a state-ownership decision:

1. **Trace persistence across tab toggles.** The PRD says "trace output persisted across Manage↔Test tab toggles within a single page lifecycle." If `TestSurface` owns its own `lastTrace` state and is unmounted when the operator clicks Manage, the trace is lost.
2. **Test → Manage deep-link.** Clicking the matched-result card's source-row reference closes the Test tab, switches to Manage, and opens that row's `RowEditForm` pre-focused. This requires the click handler in `TestSurface` to know about and reach into `RedirectMapDetail` (the inline-row-edit owner) — a sibling component.

Three architectural options:

1. **Local-to-TestSurface state, useState in the component.** Simplest. Loses trace state on unmount. Cannot drive a sibling component to open a specific row.
2. **Event bus / pub-sub.** `TestSurface` emits `request-edit-row({ mapId, rowIndex })`; `RedirectMapDetail` subscribes. Decoupled, but adds a new abstraction the codebase doesn't currently use; cognitive load for one consumer pair.
3. **Lift state to `FullPage`, plain props down to children, `forwardRef` imperative handle on `RedirectMapDetail`.** State ownership is one level up; deep-link uses `redirectMapDetailRef.current?.openRow({ mapId, rowIndex })`. No new abstractions; React-idiomatic.

The Test surface has exactly **one** sibling it ever needs to drive (`RedirectMapDetail`), and `FullPage` is already a thin orchestrator that owns the tab state today (PRD-002 V4 layout). Adding two more state fields and one ref to it does not introduce structural debt.

## Decision

Lift `lastTrace: SimulationTrace | null` and `activeTab: 'manage' | 'test'` from `TestSurface` up to `FullPage`. `TestSurface` receives `lastTrace` and `onTraceChange` as props; the deep-link callback `onOpenRowEdit({ mapId, rowIndex })` lives on `FullPage` and uses a `useRef` to `RedirectMapDetail` exposing an imperative `openRow()` method via `forwardRef` + `useImperativeHandle`.

- **No event bus.** Plain props + ref.
- **No context provider.** Sole consumer pair is `FullPage` ↔ (`TestSurface`, `RedirectMapDetail`).
- **No URL state.** Active tab and trace do not survive a page reload (per PRD § 9 State model — "resets to 'Manage' on page reload").

The imperative handle interface:

```typescript
type RedirectMapDetailHandle = {
  openRow: (args: { mapId: string; rowIndex: number }) => void;
};
```

`FullPage` shape:

```tsx
function FullPage() {
  const [activeTab, setActiveTab] = useState<'manage' | 'test'>('manage');
  const [lastTrace, setLastTrace] = useState<SimulationTrace | null>(null);
  const detailRef = useRef<RedirectMapDetailHandle>(null);

  const handleOpenRowEdit = ({ mapId, rowIndex }) => {
    setActiveTab('manage');
    detailRef.current?.openRow({ mapId, rowIndex });
  };

  return (
    <>
      <TabControl active={activeTab} onChange={setActiveTab} />
      {activeTab === 'manage' && <RedirectMapDetail ref={detailRef} ... />}
      {activeTab === 'test' && (
        <TestSurface
          lastTrace={lastTrace}
          onTraceChange={setLastTrace}
          onOpenRowEdit={handleOpenRowEdit}
        />
      )}
    </>
  );
}
```

## Consequences

**Easier:**
- Trace state survives Manage↔Test toggles for free — the trace lives one level above the component that gets unmounted
- Deep-link is one function call; no subscription lifecycle, no missed-event race conditions
- Component-test fixtures stay simple — `TestSurface` and `RedirectMapDetail` each receive their orchestration via props, easy to mock in isolation
- No new abstractions to onboard new contributors to

**Harder:**
- `FullPage` grows two state fields and one ref — modest cognitive bloat, but `FullPage` already orchestrates tab + selected-map state today, so it's the right home
- Any future feature that needs Test-state visibility from a *third* sibling will need to either lift further (probably to context) or pipe through `FullPage` — accepted as future-work cost
- `forwardRef` + `useImperativeHandle` carries a small surface (the `RedirectMapDetailHandle` interface) that has to stay in sync with internal `RedirectMapDetail` implementation; if `RedirectMapDetail` is refactored, the imperative handle is the contract

**Future revisit triggers:**
- If a second consumer ever needs `lastTrace` (e.g. a Dashboard widget that shows "last tested URL") → lift to context
- If multiple components ever need to drive `RedirectMapDetail` imperatively → consider replacing the ref with a small store (Zustand) for `openRow` + `selectMap` + `scrollToRow` actions

## Date

2026-05-20
