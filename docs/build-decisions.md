# Build decisions — Redirect Manager

Why this code is shaped the way it is, at component grain. Source files link here
instead of carrying the reasoning inline (rule `87-comment-economy`).

Architecture decisions live in `../project-planning/ADR/`.

Anchors are a contract — source comments point at them. Never rename one; supersede it.

> **Provenance.** Harvested 2026-08-12 from source-file header comments (330 lines, 11 blocks).

---

## Authoring GraphQL — what the real tenant actually accepts

### The mutation envelope and unwrap, verified against a live tenant {#authoring-mutations}

**Decision.** `client.mutate('xmc.authoring.graphql', …)` with the **body INSIDE `params`**, and
a **DOUBLE unwrap** — `result.data.data.<mutation>`. All mutations pass `language: 'en'`.

**Verified 2026-05-11 in a real-tenant capture session**, which closed all seven assumed-shape
annotations at once:

- **`createItem` does NOT accept an `id` field** — the server returns `EXEC_INVALID_TYPE`. This
  settles the open question definitively: **a caller-supplied GUID is impossible**, so a
  cross-environment import always mints a **new** GUID on every "create". The import summary
  screen must flag newly minted GUIDs as a fast-follow indicator rather than implying the id
  round-tripped.
- **`updateItem` has single-field semantics** — sending one field in `fields[]` updates only that
  field and leaves the rest untouched. The canonical boolean write representation is the
  **string** `'0'` / `'1'`; the server also tolerates `'true'`/`'false'`, but `'0'`/`'1'` is what
  ships.
- **`updateItem` does NOT accept `name`** — rename has its own dedicated mutation.
- **`RedirectType` is a string at the GraphQL level, not an enum** — `'ServerTransfer'`,
  `'Redirect301'`, `'Redirect302'`. **`'Redirect307'` is rejected by the head-app resolver**
  (operator-confirmed).

### The page-context matcher key, with divergence detection built in {#page-context-key}

**Decision.** `pages.context` is subscribed via `client.query('pages.context', { subscribe: true,
onSuccess })`. The `onSuccess` callback receives the context **directly — no extra `.data`
unwrap**. The matcher key is `pageInfo.url`.

**The matcher key was a working assumption, so the code instruments it.** On the first message it
logs **both** `pageInfo.url` and `pageInfo.route` under a dev-only prefix, so the real-tenant
smoke can close the question **by inspection** rather than by argument.

**`pageInfo.path` is the Sitecore item tree path and is NOT the matcher key** — named explicitly
so it is not reached for by mistake.

---

## Parity with upstream

### Upstream fixtures are extracted by a committed AST walker {#upstream-fixtures}

**Decision.** A committed script AST-walks the upstream `redirects-proxy.test.ts` at a **pinned
SHA** and emits a committed JSON fixture set. The upstream source file itself is **gitignored**;
the operator fetches it with a documented `curl` when the extractor needs to re-run.

**Why a walker and not a hand-port.** The upstream tests use Chai + Sinon + Next.js mocks and
assert on stub arguments — none of which transfers. The walker extracts only the inputs (proxy
config: pattern, target, redirect type, flags; plus the request pathname), and the **expected
result is derived by running our own simulator** against those inputs, since we claim 100%
parity. An upstream "rewrite" assertion becomes `matched: true` with
`redirectType: 'ServerTransfer'`.

**Deliberately excluded:** file-detection, preview and prefetch skip cases. Those are
pre-filter-only, with no redirect rule matching at all — they test middleware plumbing, not the
matching algorithm.

**The trace renderer is exhaustive by construction** — `assertNeverStage` is called in the
default branch, so a new simulation stage is a **compile-time** failure rather than a silently
unrendered card.

---

## UI decisions

### One way to edit a row {#one-edit-surface}

**Decision.** The edit modal **replaces** inline row editing entirely. No UX duality.

**Mode is transient UI state** — it defaults to `pattern` on every open and is **never persisted
to Sitecore**.

**⚠ STRUCTURAL GUARD:** this file must not render `RedirectType`, `IncludeVirtualFolder`,
`PreserveQueryString` or `PreserveLanguage` controls. Those are **map-level SHARED fields** owned
by the map-settings UI; surfacing them per row would imply a per-row scope that does not exist.

**Four affordances were removed after operator UX feedback** on the visual smoke — the snippet
library, capture-group chips, the live regex sample-URL tester, and the inline mode-mismatch
hint. Their tests were removed with them rather than left skipped.

**Save-time validation blocks the save and keeps the modal open** — an invalid regex, a `$0`
reference, or `$N` beyond the capture-group count. **`$siteLang` is exempt from the count
cross-check.**

**Cancel confirms only when there are unsaved changes**; with none, it closes immediately.

### The dashboard widget cannot know its own site {#dashboard-site-picker}

**Decision.** The widget shows per-site stats behind a small site picker: auto-selected when the
tenant has one site, restored from `localStorage` when the operator has chosen before, otherwise
a dropdown in the header.

**Why the workaround exists.** Cloud Portal embeds the widget on a site dashboard page, but
**neither the iframe URL nor the SDK `ApplicationContext` expose "current site"** — verified
against `shared-types.d.ts`: there is no site field on `ApplicationContext`,
`ApplicationResourceContext`, or the extension-point context.

**Mock tiles are marked, real tiles are not.** Real stats (Maps / Mappings / Last-updated) carry
the shared chrome and no `data-preview-mock` attribute; every mock surface does. The
"Redirect counts only…" footnote was deleted and consolidated into the preview banner.

### Semantic tokens only, never hex, never `hsl(var())` {#semantic-tokens}

**Decision.** Every colour is `var(--token)`. Warning tints use
`color-mix(in oklch, var(--destructive) 30%, var(--card))`.

**⚠ Never `hsl(var(--token))`** — the tokens carry hex values, and wrapping a hex in `hsl()`
produces an invalid colour that silently collapses. Guards enforce no `#hex` literals, no
"N languages" copy, and no legacy status-pill modifiers.

### The 960px breakpoint is JS, deliberately {#js-breakpoint}

**Decision.** The Full Page shell switches between two-pane and tabbed layouts on
`window.innerWidth`, **not** a media query — so the behaviour is observable in jsdom.

**Tab state is persisted across the switch**: returning from Detail to Browse keeps the map
selection. `activeTab` and `lastTrace` are lifted to the shell — `lastTrace` survives tab
toggles within one page lifecycle, `activeTab` is never persisted.

**The Test → Manage deep link is an imperative handle**, not a state cascade: the shell switches
tab, selects the parent map, and drives `startEditRow()` on the detail pane through a ref.

**A write increments a refresh key** so the list refetches, and the loaded list is **reconciled
by id** so the current selection survives.

---

## Test-environment decisions

### jsdom does not apply stylesheet rules, so tokens are injected {#jsdom-token-injection}

**Decision.** Blok Nova CSS variables are set **directly on `document.documentElement.style`** in
test setup, with values resolved from the light-mode `:root` block of `globals.css`.

**Why.** jsdom does not compute class-based CSS rules, so `getComputedStyle()` returns `''` for
any property set through a class that references a custom property. Injecting the variables makes
it possible to assert a token is **defined and not collapsed** to the jsdom default.

**What this actually proves, stated honestly:** it is a **proxy** for "the token would resolve in
a real browser". The failure pattern it detects is the collapse chain — undefined var →
`currentColor` → `rgb(0,0,0)`. It does not prove the cascade.

Dark-mode assertions call the dark injector and wrap the element in a `.dark` parent.

### Hydration safety is a standing constraint {#hydration-safety}

**Decision.** All DOM manipulation and browser-global access (`window.matchMedia`,
`getComputedStyle`) lives inside `useEffect`. **Never branch on `typeof window` in a render body
or a `useState` initialiser.**

**The letter-reveal hook's reduced-motion gate skips splitting entirely** and sets opacity to 1
immediately, rather than running the animation faster.

**⚠ Known conflict, recorded rather than solved:** the splitter operates on top-level
`textContent`. An element containing nested spans (e.g. gradient text) keeps its full text but
may have those spans flattened.

---

## Evidence index

**Captured probe:** `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` — the
authored-vs-resolved round-trip against the live resolver that established the field write
representations (boolean as the string `'0'`/`'1'`, `RedirectType` as a string not an enum, and
`'Redirect307'` being rejected by the head-app resolver).

**Upstream parity pin:** the fixture set is extracted at upstream SHA
`30b0db8fe768b83f03fd6b9772b0d3e14711c6b2` (`Sitecore/content-sdk`,
`packages/nextjs/src/proxy/redirects-proxy.test.ts`). Re-extraction against a different SHA is a
deliberate act, not a refresh — the parity claim is pinned to this one.
