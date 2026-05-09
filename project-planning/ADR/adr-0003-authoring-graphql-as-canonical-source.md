# ADR-0003: Authoring GraphQL is the single canonical source for redirect rules

## Status

Accepted

## Context

Redirect Manager could store its rules in three places:

1. **Sitecore Authoring GraphQL on Redirect Map items.** Canonical home; the head application's redirect resolver already reads from here.
2. **An external KV / datastore** (Upstash, Supabase, etc.) — would require a sync pathway and double bookkeeping.
3. **A hybrid model** — rules in Sitecore, an aggregate cache somewhere else for read performance.

For MVP scope, the rule set is small (≤500 mappings per site, ≤30 items), Authoring GraphQL latency is acceptable, and the head app already reads rules from Sitecore at request time. Introducing a second store creates two sources of truth and a sync race condition the head app would have to handle. The user's earlier proposal of a hybrid analytics store concerns *telemetry*, not rules.

## Decision

In MVP and all foreseeable future PRDs, **Sitecore Authoring GraphQL on Redirect Map items is the single canonical source for redirect rules.** The app reads and writes rules directly via Authoring GraphQL with the operator's authenticated session — no caching layer, no external KV for rules, no eventual-consistency aggregator.

(Telemetry — hit counts, 404 reports — will live in Upstash from PRD-001 onward; that is a separate decision and concerns telemetry only, not rules.)

## Consequences

**Easier:**
- One source of truth. Edits in Content Editor and edits in Redirect Manager are immediately consistent — no sync delay.
- Head app and Redirect Manager read the same backend; no schema reconciliation between two stores.
- Trivial install — the app provisions nothing.

**Harder:**
- Per-rule edits incur Authoring GraphQL latency on every operation. Acceptable at MVP scale (NFR-P4 = ≤3 s p95). May not scale to thousands of mappings per site (NFR-S1 caps MVP at ~500).
- Bulk operations (deferred to a later PRD) will have to batch carefully against the Authoring endpoint.
- The Dashboard "last-updated" tile cannot be derived from a precomputed aggregate — it requires reading every item's `__Updated` and taking the max. Acceptable at MVP scale; revisit if scale tier rises.

## Date

2026-05-09
