# Operations

Operational reference for Redirect Manager: known limitations, smoke checklists, and publish-credential setup. For the full architecture see [architecture.md](architecture.md).

---

## Known limitations

### Context Panel match scope

The Context Panel uses **exact-string source/target match** only. Regex source rows are skipped, and the matcher does not normalize language-prefixed routes (e.g. `/de/products` will not match a redirect with source `/products`). A non-dismissible banner makes this explicit in the UI. See [ADR-0005](../project-planning/ADR/adr-0005-context-panel-exact-match-only.md) for rationale; regex-aware matching is a follow-on PRD candidate.

### No concurrent-edit detection

Last writer wins. Two operators editing the same Redirect Map simultaneously will silently overwrite each other. Concurrent-edit detection (freshness tokens, "modified externally" banner) is deferred to a future PRD.

### No usage analytics

Hit counters and broken-vs-healthy detection are not implemented. Counts (maps, mappings, last-updated) are derived from Authoring GraphQL only. Analytics are deferred to a follow-on PRD.

### Dashboard Widget site picker

Cloud Portal does not pass per-site context to Dashboard Widget embeds. The widget falls back to a site picker; the operator's last selection persists via `localStorage`.

### Cross-tenant imports mint fresh GUIDs

`create` actions during JSON import always mint fresh GUIDs on the target tenant because the Authoring `createItem` mutation rejects caller-supplied `id` (ADR-0009). The import summary surfaces this per item.

### Publish Site — cross-machine resume window

Cross-session publish resume is best-effort within a 60-minute window. Publishes triggered on machine A more than an hour ago must be verified in the SitecoreAI publishing list directly when opened on machine B.

### Publish Site — English only

`UrlMapping` is a SHARED Sitecore field (no language axis), so publish jobs use `locales: ["en"]`. Publishing multiple locales would re-publish byte-identical data. Multi-locale support is deferred.

---

## Publish Site setup (PRD-003)

The Publish Site feature requires an OAuth automation client with publishing scopes. This is a one-time setup per tenant.

**Required scopes:** `xmcloud.cm:admin` + `xmcpub.jobs.a:r` + `xmcpub.jobs.a:w`

1. In Cloud Portal, create a new automation client with the scopes above.
2. Capture the client ID and secret.
3. Add to `.env.local`:

```
SITECORE_PUBLISH_CLIENT_ID=<your-client-id>
SITECORE_PUBLISH_CLIENT_SECRET=<your-client-secret>
```

The token endpoint, audience, and Publishing base URL (`https://edge-platform.sitecorecloud.io`) are pre-filled in `.env.example` — no changes needed for those unless you are targeting a non-standard environment.

---

## Upstream parity maintenance (PRD-005)

When the Test tab surfaces a drift banner — *"Upstream `RedirectsProxy` has changed since this simulator was ported"* — an engineer needs to resync the local `proxy-simulator.ts` with the latest upstream code from Sitecore/content-sdk `dev`. This is a dev-time task.

### Quick procedure

1. Open Claude Code at the product root (`products/redirect-manager/`).
2. Run **`/sync-redirect-proxy`** — the slash command lives at [`.claude/commands/sync-redirect-proxy.md`](../.claude/commands/sync-redirect-proxy.md) and is auto-discovered.
3. Review each proposed patch hunk in the inline edit flow; accept all to proceed.
4. The command then regenerates `__fixtures__/upstream-cases.json`, runs `npm test -- proxy-simulator`, and on green bumps the SHAs in `__fixtures__/upstream-snapshot.json`.
5. Commit the three files (`proxy-simulator.ts` + `upstream-snapshot.json` + `upstream-cases.json`) together and push. The in-app baseline picks up the bump on the next Vercel deploy.

If a particular upstream change is one you deliberately do not want to port (rare), record it in the snapshot's `knownDivergences[]` array (`reason` + `function` + `upstreamSha`). The slash command honors that list and skips proposing changes for the named functions.

See README → **Dev-time tools** for the full step-by-step + design rationale (ADR-0044, ADR-0045, ADR-0047).

---

## Smoke checklists

Before any ship, run the applicable real-tenant smoke checklists. All checklists live under [`site/docs/`](../site/docs/):

| Checklist | Gate | Description |
|---|---|---|
| [`registration.md`](../site/docs/registration.md) | m1 — one-time | Cloud Portal Test App registration |
| [`smoke-crud.md`](../site/docs/smoke-crud.md) | m3 | CRUD round-trip (create / edit / delete redirect + map) |
| [`smoke-import-export.md`](../site/docs/smoke-import-export.md) | m4 | Import / export round-trip with conflict resolution |
| [`smoke-live-walkthrough.md`](../site/docs/smoke-live-walkthrough.md) | m5 | 5-minute live walkthrough across all three surfaces |
| [`host-frame-smoke.md`](../site/docs/host-frame-smoke.md) | m2 | 5-axis pixel comparison against POC clickdummy |
| [`smoke-publish.md`](../site/docs/smoke-publish.md) | m_publish | Publish Site happy path + cancel + error path |

**Outcome recording** — smoke results are recorded in `project-planning/workflow/current-run.json` → `smoke_outcomes`. A mix of `passed` and `skipped` outcomes produces a `shipped_with_caveats` ship status; any `failed` outcome blocks ship.
