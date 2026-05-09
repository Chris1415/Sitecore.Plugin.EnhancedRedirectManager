# ADR-0008: `UrlMapping` field encoding contract — URL-encoded `=`/`&`-delimited pairs

## Status

Accepted

## Context

The Sitecore Redirect Map item stores its source→target mapping list in a single field named `UrlMapping`. The field type is a string; the value is a serialized list of pairs.

A real-tenant query against the Preview endpoint (which has the same field shape as Authoring on reads) returned this `UrlMapping` value:

```
%2ftest=%2FnewTest&%2fhello=%2Fworld
```

Parsed:

- Pairs are joined by `&`.
- Within each pair, source and target are joined by `=` (the **first** `=` is the delimiter).
- Both source and target are URL-encoded.
- Mixed-case URL encoding is observed (`%2f` lowercase for sources, `%2F` uppercase for targets in this sample). The pattern may not be intentional; the app must treat encoding case-insensitively on parse and produce a consistent encoding on serialize.

The order of pairs is significant — operators control mapping order via drag handles in the UI (US-8), and the order is meaningful for the head application's resolver (first-match-wins for regex-pattern redirects in the future).

## Decision

The `UrlMapping` field encoding contract is:

**Format:** `<encoded-source>=<encoded-target>` pairs, joined by `&`, with no leading/trailing delimiter.

**Encoding:** standard `encodeURIComponent` for source and target on serialize. URL-decode on parse using `decodeURIComponent`. Encoding case (lowercase vs uppercase hex) is normalized on serialize to uppercase (`%2F`); on parse, both cases are accepted.

**Pair delimiter:** the **first** `=` in a pair separates source from target. Subsequent `=` characters in the target are not delimiters (and should be `%3D`-encoded by serialize).

**Pair separator:** `&` — sources/targets must `%26`-encode any literal ampersand.

**Order:** preserved on round-trip parse → edit → serialize. The order in the JSON export equals the order in the Sitecore field equals the order in the UI. **No alphabetic sort, no deduplication.**

**Edge cases on parse:**
- Empty `UrlMapping` value → empty list, not an error.
- Pair with no `=` (e.g. just `%2ffoo`) → emit a non-fatal warning, skip the pair.
- Pair with empty source or empty target after decoding → emit a non-fatal warning, skip the pair.

**Edge cases on serialize:**
- Empty list → empty string `""`.
- Empty source or empty target → blocked at write time by FR-11 (UI validation), so should never reach the serializer; defensively, the serializer skips such rows and logs a warning.

The parse/serialize logic must be **lossless across round-trips**: parse(serialize(parse(x))) === parse(x) for any x produced by the app, and serialize(parse(x)) === x for any x produced by the app's serializer (modulo encoding-case normalization).

This contract is unit-tested with property-based tests covering: random valid URL paths, paths containing `=` and `&`, paths containing already-encoded characters, mixed encoding case, empty list, single-pair, large lists.

## Consequences

**Easier:**
- The contract is fully specified — engineering can implement parse/serialize against unit tests in one pass.
- Round-trip correctness is a property test, not a manual review concern.
- New rows added by the operator round-trip identically to rows authored in Content Editor (after one save cycle if the original was lowercase-encoded).

**Harder:**
- Existing items in the wild may contain unusual encodings (mixed-case hex, double-encoded characters, literal `=` or `&` not encoded). The defensive parse handles this with warnings; QA must include a "round-trip on every existing Redirect Map in the test tenant" smoke gate to catch surprises before ship.
- Encoding normalization on save (lowercase → uppercase) means the first save of an existing item changes the on-disk value even when the operator made no logical edit. Acceptable; the change is not user-visible after decoding.

## Date

2026-05-09
