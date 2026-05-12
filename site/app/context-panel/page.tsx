"use client";

/**
 * Context Panel extension point (xmc:pages:contextpanel).
 * Route: /context-panel
 *
 * Tranche 4 (T022–T030): Real Operator Console (v1) UI.
 * Replaces the Tranche 2 capture-helper that was here previously.
 *
 * Wiring:
 * - subscribePageContext → pageInfo.route is the matcher key (OQ-A closed 2026-05-11)
 * - listRedirectMaps → fetches Redirect Maps for the current site
 * - matchPageRedirects → groups matched redirects by parent Map
 * - After writes: reloadPagesCanvas (T015) + re-fetch
 *
 * iframe constraints per § 4c-4: 320–400 px wide, scrollable. No topbar.
 */

import { ContextPanel } from "@/components/context-panel/ContextPanel";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";
import { requireContextId } from "@/lib/sdk/require-context-id";

export default function ContextPanelPage() {
  const client = useMarketplaceClient();
  const appCtx = useAppContext();
  const sitecoreContextId = requireContextId(appCtx);

  return (
    <ContextPanel client={client} sitecoreContextId={sitecoreContextId} />
  );
}
