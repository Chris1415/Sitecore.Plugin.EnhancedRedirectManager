# ADR-0009: Import matching by Sitecore item GUID (not by item name)

## Status

Accepted

## Context

JSON import promotes redirect rules from one site/environment to another. The importer must decide: "is this incoming Redirect Map item the *same* as an existing item in the target?" Two candidate matching keys:

- **Item name** — human-readable, intuitive in the UI, but not unique across sites or environments. Two unrelated sites could each have a `Marketing Campaigns` Redirect Map with completely different mappings; importing site-A's into site-B by name would silently treat them as conflicting and offer an overwrite path that the operator might approve out of habit.
- **Sitecore item GUID** — globally unique, stable across the lifetime of an item, identical between environments when items were created via the standard "publish to next environment" workflow. The mismatch case (same name, different GUIDs) becomes a clear "two new items to create", which is the intuitive outcome.

The user's PRD-000 critical-review answer (Q-CR-3) was unambiguous: **match by Sitecore item GUID**.

The cost: the JSON export must include the GUID for every item. The cost is trivial — one string field per item.

## Decision

JSON export includes each Redirect Map's **Sitecore item GUID** as the `id` field of every item record (per the `redirect-manager/v1` schema in PRD-000 § 10).

JSON import uses the GUID to classify each incoming item:

- **GUID exists in target site** → conflicting (compare fields; if any differ, require explicit operator action — create / overwrite / skip per ADR-0006).
- **GUID does not exist in target site** → new (default action = create; operator can still skip).

Item name is included in the JSON for human readability and diff display, but does not participate in matching. Two items with the same name but different GUIDs are two different items, period.

GUID format: standard Sitecore `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}` curly-brace form (matching the on-disk path syntax, e.g. `item(path: "{E39157F3-A81F-4692-B05D-178D48C836DE}")`).

## Consequences

**Easier:**
- Cross-environment promotion has unambiguous semantics. Two items only "match" when they truly are the same item.
- Re-importing the same JSON multiple times is idempotent — same GUIDs, same conflicts, same operator decisions.
- The UI diff view between current and incoming values is meaningful — it compares two versions of the same item, not two different items that happen to share a name.

**Harder:**
- A target environment that lacks the items entirely (fresh install, fresh tenant) sees every incoming item as "new" and creates them with the source-environment GUIDs — possible only if the Authoring `createItem` mutation accepts an explicit `id` argument. **Architecture-stage verification needed:** if `createItem` does not let the caller specify the GUID, the import flow either (a) creates items with new GUIDs (losing the cross-environment match) or (b) requires a different mutation path. Document the resolution as part of OQ-9.
- An operator copying a Redirect Map item by hand (Sitecore "duplicate" command) gets a new GUID for the copy. The duplicate cannot be "matched" against the original by this importer — they are correctly two different items.
- Operators who think in names ("the Marketing Campaigns map") may be confused when the import previewer says "new" for an item that has the same name in both sites. Mitigated by the diff view showing both name and GUID, and by a small banner in the preview: "Matching is by Sitecore item ID, not by name. Two items with the same name but different IDs are different items."

## Date

2026-05-09
