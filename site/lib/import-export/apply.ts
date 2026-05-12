/**
 * T052 — lib/import-export/apply.ts
 *
 * Sequential batch executor for the import wizard's Apply step.
 *
 * Given resolved actions (create / overwrite / skip) for each incoming item,
 * runs the corresponding createRedirectMap / updateRedirectMap calls one at
 * a time, accumulating per-item results.
 *
 * Per ADR-0009: the Authoring schema does NOT accept a caller-supplied `id`
 * on createItem — every "create" action mints a new GUID server-side. The
 * result includes both the incoming (source) id and the newly minted (server)
 * id so the summary UI can flag GUID-preservation losses.
 *
 * Errors on individual items are captured in the result, not thrown — the
 * batch always completes.
 *
 * Pure module — accepts the SDK functions as dependencies to keep this file
 * test-friendly. The caller wires in client + sitecoreContextId via the
 * `runWrites` parameter.
 */

import type { ExportItem } from '@/lib/import-export/schema';
import type { CreateRedirectMapInput, UpdateRedirectMapInput, WriteResult } from '@/lib/sdk/redirects-write';

export type ImportAction = 'create' | 'overwrite' | 'skip';

export interface ResolvedItem {
  /** The incoming item from the import JSON. */
  item: ExportItem;
  /** Operator's chosen action for this item. */
  action: ImportAction;
  /**
   * For 'overwrite' actions: the existing item's id in the target site.
   * (Required because the incoming.id may differ if the target had a
   * locally-minted GUID for the same logical item — though in our flow
   * we match by id, so this is usually identical to incoming.id.)
   */
  existingId?: string;
}

export interface ApplyItemResult {
  incomingId: string;
  name: string;
  action: ImportAction;
  ok: boolean;
  /** Server-minted id on successful 'create'. May differ from incomingId per ADR-0009. */
  newId?: string;
  error?: string;
}

export interface ApplyResult {
  results: ApplyItemResult[];
  totals: {
    created: number;
    overwritten: number;
    skipped: number;
    failed: number;
  };
}

export interface ApplyDependencies {
  /** Wraps createRedirectMap; called per 'create' action. */
  create: (input: CreateRedirectMapInput) => Promise<WriteResult>;
  /** Wraps updateRedirectMap; called per 'overwrite' action. */
  update: (input: UpdateRedirectMapInput) => Promise<WriteResult>;
  /** Settings/Redirects folder GUID for the target site. */
  parentId: string;
  /** Redirect Map template GUID for the tenant. */
  templateId: string;
}

export interface ApplyProgress {
  /** 1-based index of the item currently being processed. */
  current: number;
  /** Total number of resolved items (incl. skips). */
  total: number;
  /** Name of the item currently being processed. */
  name: string;
}

/**
 * Apply the resolved import actions sequentially.
 *
 * @param resolved - The operator's per-item action choices from the preview step.
 * @param deps - SDK wrappers + parent/template GUIDs.
 * @param onProgress - Optional progress callback fired before each item is processed.
 * @returns Per-item results plus totals.
 */
export async function applyImport(
  resolved: ResolvedItem[],
  deps: ApplyDependencies,
  onProgress?: (progress: ApplyProgress) => void,
): Promise<ApplyResult> {
  const results: ApplyItemResult[] = [];
  const totals = { created: 0, overwritten: 0, skipped: 0, failed: 0 };

  for (let i = 0; i < resolved.length; i++) {
    const { item, action, existingId } = resolved[i];
    onProgress?.({ current: i + 1, total: resolved.length, name: item.name });

    if (action === 'skip') {
      results.push({
        incomingId: item.id,
        name: item.name,
        action: 'skip',
        ok: true,
      });
      totals.skipped++;
      continue;
    }

    try {
      if (action === 'create') {
        const writeResult = await deps.create({
          name: item.name,
          templateId: deps.templateId,
          parentId: deps.parentId,
          redirectType: item.redirectType as CreateRedirectMapInput['redirectType'],
          preserveQueryString: item.preserveQueryString,
          preserveLanguage: item.preserveLanguage,
          includeVirtualFolder: item.includeVirtualFolder,
          mappings: item.mappings,
        });
        if (writeResult.ok && writeResult.itemId) {
          results.push({
            incomingId: item.id,
            name: item.name,
            action: 'create',
            ok: true,
            newId: writeResult.itemId,
          });
          totals.created++;
        } else {
          results.push({
            incomingId: item.id,
            name: item.name,
            action: 'create',
            ok: false,
            error: 'Server returned no itemId.',
          });
          totals.failed++;
        }
      } else {
        // overwrite
        const targetId = existingId ?? item.id;
        const writeResult = await deps.update({
          itemId: targetId,
          name: item.name,
          redirectType: item.redirectType as UpdateRedirectMapInput['redirectType'],
          preserveQueryString: item.preserveQueryString,
          preserveLanguage: item.preserveLanguage,
          includeVirtualFolder: item.includeVirtualFolder,
          mappings: item.mappings,
        });
        if (writeResult.ok) {
          results.push({
            incomingId: item.id,
            name: item.name,
            action: 'overwrite',
            ok: true,
          });
          totals.overwritten++;
        } else {
          results.push({
            incomingId: item.id,
            name: item.name,
            action: 'overwrite',
            ok: false,
            error: 'Server rejected the update.',
          });
          totals.failed++;
        }
      }
    } catch (error) {
      results.push({
        incomingId: item.id,
        name: item.name,
        action,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      totals.failed++;
    }
  }

  return { results, totals };
}
