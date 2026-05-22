/**
 * lib/dev/t1-probe-runner.ts — PRD-004 Tranche 1 diagnostic
 *
 * Pure logic module — no React, no UI imports.
 *
 * Orchestrates:
 *   1. Resolve parent path to itemId via resolveItemIdByPath
 *   2. Create throwaway Redirect Map with all 8 probe specs
 *   3. Re-read the map from the tenant via listRedirectMaps
 *   4. Byte-for-byte diff authored vs observed per row
 *   5. Aggregate per-character-class matrix
 *   6. Delete the throwaway map in a finally block (always runs)
 *
 * NOT production code — dead unless NEXT_PUBLIC_T1_PROBE=true.
 */

import type { ClientSDK } from '@/lib/sdk/types';
import { resolveItemIdByPath, discoverRedirectMapTemplateId } from '@/lib/sdk/redirects-discover';
import { createRedirectMap, deleteRedirectMap } from '@/lib/sdk/redirects-write';
import { listRedirectMaps } from '@/lib/sdk/redirects-read';
import { T1_PROBE_SPECS, ALL_CHARACTER_CLASSES } from '@/lib/dev/t1-probe-specs';

export interface RowDiff {
  /** authored value */
  authored: string;
  /** observed (round-tripped) value */
  observed: string;
}

export interface RowResult {
  specId: string;
  description: string;
  status: 'PASS' | 'FAIL';
  sourceDiff: RowDiff | null; // null = PASS (identical)
  targetDiff: RowDiff | null; // null = PASS (identical)
}

export interface ClassResult {
  key: string;
  label: string;
  rowIds: string[];
  status: 'PASS' | 'FAIL' | 'N/A';
  failingRows: string[];
}

export interface T1ProbeResult {
  status: 'pass' | 'partial' | 'fail';
  perRowResults: RowResult[];
  perClassMatrix: ClassResult[];
  /** GUID of the created throwaway map (useful for manual cleanup if needed) */
  mapId: string;
  mapName: string;
  deletedCleanly: boolean;
  /** Populated on exception — summary of what went wrong */
  error?: string;
}

// Sitecore ItemNameValidation regex: ^[\w\*\$][\w\s\-\$]*(\(\d{1,}\)){0,1}$
// — parens are only allowed around digits, so plain dashes + spaces + letters only.
const PROBE_MAP_NAME = 'PRD-004 T1 Probe AUTO-DELETE-SAFE';

/**
 * Runs the full T1 probe against a live Sitecore tenant.
 *
 * @param client           Marketplace ClientSDK instance from app context
 * @param sitecoreContextId Preview context ID (always .preview per ADR architecture)
 * @param parentPath       Sitecore path to Settings/Redirects folder, e.g.
 *                         /sitecore/content/MarketingSiteCollection/MarketingSite/Settings/Redirects
 * @param templateId       Sitecore Redirect Map template GUID (operator-supplied)
 */
export async function runT1Probe(
  client: ClientSDK,
  sitecoreContextId: string,
  parentPath: string,
  templateId: string,
): Promise<T1ProbeResult> {
  let createdItemId: string | undefined;
  let deletedCleanly = false;

  // Defensive GUID + path normalization. Sitecore Authoring fixtures use
  // lowercase 32-hex (no dashes); operators commonly paste Content Editor's
  // {GUID} format with dashes + uppercase. Strip both. Path: trim trailing slash.
  const normalizedTemplateId = templateId.replace(/[{}\-]/g, '').toLowerCase().trim();
  const normalizedParentPath = parentPath.replace(/\/+$/, '');

  try {
    // Step 1 — Resolve parentPath → parentId
    const parentId = await resolveItemIdByPath(client, sitecoreContextId, normalizedParentPath);
    if (!parentId) {
      return buildFailResult(
        '',
        PROBE_MAP_NAME,
        false,
        `Could not resolve parent path to an itemId: "${normalizedParentPath}". Check the path is correct and the context ID has read access.`,
      );
    }

    // Step 1b — Auto-discover the Redirect Map template id from an existing map
    // under this parent. Operator-supplied templateId is used as a fallback if
    // discovery fails (e.g. empty Settings/Redirects folder).
    let effectiveTemplateId = normalizedTemplateId;
    let templateSource: 'discovered' | 'operator-input' = 'operator-input';
    try {
      const discovered = await discoverRedirectMapTemplateId(client, sitecoreContextId, parentId);
      if (discovered) {
        effectiveTemplateId = discovered.replace(/[{}\-]/g, '').toLowerCase().trim();
        templateSource = 'discovered';
        // eslint-disable-next-line no-console
        console.log('[T1 probe] discovered templateId from existing map:', effectiveTemplateId);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[T1 probe] discovery returned null; falling back to operator-supplied templateId:', normalizedTemplateId);
      }
    } catch (discErr) {
      // eslint-disable-next-line no-console
      console.warn('[T1 probe] discovery threw; falling back to operator-supplied templateId:', discErr);
    }

    // Step 2 — Build the 8 probe mappings and create the throwaway map
    const mappings = T1_PROBE_SPECS.map((spec) => ({
      source: spec.authoredSource,
      target: spec.authoredTarget,
    }));

    let createResult;
    try {
      createResult = await createRedirectMap(client, sitecoreContextId, {
        name: PROBE_MAP_NAME,
        parentId,
        templateId: effectiveTemplateId,
        redirectType: 'Redirect301',
        preserveQueryString: false,
        preserveLanguage: false,
        includeVirtualFolder: false,
        mappings,
      });
    } catch (createErr) {
      const message = createErr instanceof Error ? createErr.message : String(createErr);
      // eslint-disable-next-line no-console
      console.error('[T1 probe] createRedirectMap threw:', createErr);
      return buildFailResult(
        '',
        PROBE_MAP_NAME,
        false,
        `createRedirectMap threw: ${message}. See browser console for the full error. templateId="${effectiveTemplateId}" (source: ${templateSource}), parentId="${parentId}".`,
      );
    }

    if (!createResult.ok || !createResult.itemId) {
      // eslint-disable-next-line no-console
      console.error('[T1 probe] createRedirectMap returned:', createResult, {
        effectiveTemplateId,
        templateSource,
        operatorTemplateId: normalizedTemplateId,
        parentId,
        normalizedParentPath,
        firstMappingSource: mappings[0]?.source,
        mappingCount: mappings.length,
      });
      return buildFailResult(
        '',
        PROBE_MAP_NAME,
        false,
        `createRedirectMap returned ok=false (no itemId). Sitecore Authoring rejected the mutation silently. See browser console for the full result. templateId="${effectiveTemplateId}" (source: ${templateSource}), parentId="${parentId}". If templateSource=discovered, the template id came from an existing map under the parent — so the more likely cause is that the mapping value itself is being rejected (which would be the encoder/decoder bug T1 is hunting). Console-log the raw result then share it.`,
      );
    }

    createdItemId = createResult.itemId;

    // Step 3 — Re-read via listRedirectMaps (same path the runtime proxy uses)
    const allMaps = await listRedirectMaps(client, sitecoreContextId, parentPath);
    const probeMap = allMaps.find((m) => m.id === createdItemId);

    if (!probeMap) {
      return buildFailResult(
        createdItemId,
        PROBE_MAP_NAME,
        false,
        `Throwaway map was created (itemId: ${createdItemId}) but listRedirectMaps did not return it. ` +
          `It may have been filtered out (wrong template name?) or the list query returned a stale snapshot.`,
      );
    }

    // Step 4 — Diff authored vs observed per row
    const perRowResults: RowResult[] = T1_PROBE_SPECS.map((spec, idx) => {
      const observed = probeMap.mappings[idx];

      if (!observed) {
        return {
          specId: spec.id,
          description: spec.description,
          status: 'FAIL' as const,
          sourceDiff: {
            authored: spec.authoredSource,
            observed: '(missing — row not present in round-tripped map)',
          },
          targetDiff: {
            authored: spec.authoredTarget,
            observed: '(missing)',
          },
        };
      }

      const sourcePass = observed.source === spec.authoredSource;
      const targetPass = observed.target === spec.authoredTarget;
      const pass = sourcePass && targetPass;

      return {
        specId: spec.id,
        description: spec.description,
        status: pass ? 'PASS' : 'FAIL',
        sourceDiff: sourcePass
          ? null
          : { authored: spec.authoredSource, observed: observed.source },
        targetDiff: targetPass
          ? null
          : { authored: spec.authoredTarget, observed: observed.target },
      };
    });

    // Step 5 — Build per-character-class matrix
    const rowStatusById: Record<string, 'PASS' | 'FAIL'> = {};
    for (const r of perRowResults) {
      // Map spec id "row1-anchors" → prefix "row1"
      const prefix = r.specId.split('-')[0];
      rowStatusById[prefix] = r.status;
    }

    const perClassMatrix: ClassResult[] = ALL_CHARACTER_CLASSES.map((cls) => {
      const rows = cls.rows as readonly string[];
      if (rows.length === 0) {
        return { key: cls.key, label: cls.label, rowIds: [], status: 'N/A', failingRows: [] };
      }
      const failingRows = rows.filter((rowPrefix) => rowStatusById[rowPrefix] === 'FAIL');
      return {
        key: cls.key,
        label: cls.label,
        rowIds: [...rows],
        status: failingRows.length === 0 ? 'PASS' : 'FAIL',
        failingRows,
      };
    });

    const failingRows = perRowResults.filter((r) => r.status === 'FAIL');
    const overallStatus =
      failingRows.length === 0
        ? 'pass'
        : failingRows.length === perRowResults.length
          ? 'fail'
          : 'partial';

    // Step 6 — Cleanup BEFORE constructing the return object. (Doing this in a
    // `finally` block snapshots the pre-cleanup `deletedCleanly = false` into the
    // returned object's property because the return statement is evaluated before
    // `finally` runs — caught 2026-05-20 during T1 first successful diff run.)
    if (createdItemId) {
      try {
        const deleteResult = await deleteRedirectMap(client, sitecoreContextId, createdItemId);
        deletedCleanly = deleteResult.ok;
      } catch {
        deletedCleanly = false;
      }
    }

    return {
      status: overallStatus,
      perRowResults,
      perClassMatrix,
      mapId: createdItemId,
      mapName: probeMap.name,
      deletedCleanly,
      error: undefined,
    };
  } catch (err) {
    // Error path: still attempt cleanup so the tenant isn't littered with throwaway maps
    if (createdItemId) {
      try {
        const deleteResult = await deleteRedirectMap(client, sitecoreContextId, createdItemId);
        deletedCleanly = deleteResult.ok;
      } catch {
        deletedCleanly = false;
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    return buildFailResult(
      createdItemId ?? '',
      PROBE_MAP_NAME,
      deletedCleanly,
      `Unhandled exception during probe: ${message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFailResult(
  mapId: string,
  mapName: string,
  deletedCleanly: boolean,
  error: string,
): T1ProbeResult {
  return {
    status: 'fail',
    perRowResults: [],
    perClassMatrix: [],
    mapId,
    mapName,
    deletedCleanly,
    error,
  };
}
