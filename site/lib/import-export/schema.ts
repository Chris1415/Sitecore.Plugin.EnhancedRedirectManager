/**
 * T019 — lib/import-export/schema.ts
 *
 * Zod schema for the redirect-manager/v1 JSON export format.
 * Validates the import JSON before showing the preview UI.
 *
 * Data shape matches PRD § 10 Data Model:
 * - schema: "redirect-manager/v1" (only accepted version)
 * - exportedAt: ISO-8601 timestamp string
 * - items: array of RedirectMapItem records (max 1000 per architecture § 8.2)
 *
 * Validation runs before any nested field access.
 * Returns a typed result — never throws.
 *
 * Pure module. Zero SDK dependency.
 */

import { z } from 'zod';

const MappingSchema = z.object({
  source: z.string(),
  target: z.string(),
});

const ExportItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  redirectType: z.string(),
  preserveQueryString: z.boolean(),
  preserveLanguage: z.boolean(),
  includeVirtualFolder: z.boolean(),
  updatedAt: z.string(),
  mappings: z.array(MappingSchema),
});

/**
 * The top-level export schema.
 * Only accepts schema version "redirect-manager/v1".
 * Rejects any other version with a friendly error message.
 * Enforces max 1000 items per architecture § 8.2.
 */
export const RedirectExportSchema = z.object({
  schema: z.literal('redirect-manager/v1').check((ctx) => {
    if (ctx.value !== 'redirect-manager/v1') {
      ctx.issues.push({
        code: 'invalid_value',
        values: ['redirect-manager/v1'],
        input: ctx.value,
        message: 'Unsupported schema version. Only "redirect-manager/v1" is accepted.',
      });
    }
  }),
  exportedAt: z.string().optional(),
  items: z
    .array(ExportItemSchema)
    .max(1000, {
      message:
        'Import file exceeds the maximum of 1000 redirect map items. Split into multiple files.',
    }),
});

export type RedirectExport = z.infer<typeof RedirectExportSchema>;

/** Typed export item (mirrors RedirectMapItem but sourced from JSON) */
export type ExportItem = z.infer<typeof ExportItemSchema>;

/**
 * Validate unknown JSON against the redirect-manager/v1 schema.
 *
 * @param json - Untrusted input (from JSON.parse or similar)
 * @returns { ok: true, data } on success; { ok: false, error } on failure
 */
export function validateExport(
  json: unknown,
): { ok: true; data: RedirectExport } | { ok: false; error: string } {
  const result = RedirectExportSchema.safeParse(json);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  // Format Zod errors into a human-readable string
  const messages = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { ok: false, error: messages.join('; ') };
}
