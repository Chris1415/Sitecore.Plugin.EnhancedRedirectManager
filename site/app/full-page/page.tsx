"use client";

/**
 * Full Page extension point (xmc:fullscreen).
 * Route: /full-page
 *
 * Tranche 5 — Real Operator Console (v1) UI.
 * Replaces the Tranche 2 capture helper (CaptureHelper was removed).
 *
 * Renders: <FullPage> with collection→site picker, virtualized redirect-map list,
 * and read-only detail view.
 *
 * CRUD forms (create/edit/delete) arrive in Tranche 6.
 * Import/Export wizard arrives in Tranche 7.
 */

import {
  useAppContext,
  useMarketplaceClient,
} from "@/components/providers/marketplace";
import { requireContextId } from "@/lib/sdk/require-context-id";
import { FullPage } from "@/components/full-page/FullPage";

export default function FullPagePage() {
  const client = useMarketplaceClient();
  const appCtx = useAppContext();
  const sitecoreContextId = requireContextId(appCtx);

  return (
    <div className="h-screen flex flex-col">
      <FullPage client={client} sitecoreContextId={sitecoreContextId} />
    </div>
  );
}
