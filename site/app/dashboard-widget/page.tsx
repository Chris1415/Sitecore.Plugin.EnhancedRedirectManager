"use client";

/**
 * Dashboard Widget extension point (xmc:dashboardblocks).
 * Route: /dashboard-widget
 *
 * Tranche 4 (T031–T034): Real Operator Console (v1) UI.
 * Replaces the Tranche 2 capture-helper that was here previously.
 *
 * Site resolution (OQ-7): Dashboard Widget runs in the per-site dashboard context.
 * The SDK exposes the site via application.context, but the full Sitecore path
 * to Settings/Redirects requires knowing the collection name.
 *
 * Current implementation:
 * - Uses `resources[0].tenantId` for the tenant (ADR-0007)
 * - Builds a best-effort sitePath from application.context app name:
 *   /sitecore/content/solo/<appName>/Settings/Redirects
 *   TODO (OQ-7): derive collection name dynamically at Tranche 6 smoke capture.
 *   For now hardcoded against the captured solo-website site (collection: solo).
 *
 * iframe constraints per § 4c-4: 300–800 px × 200–400 px. Single widget.
 */

import { DashboardWidget } from "@/components/dashboard-widget/DashboardWidget";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";
import { requireContextId } from "@/lib/sdk/require-context-id";

export default function DashboardWidgetPage() {
  const client = useMarketplaceClient();
  const appCtx = useAppContext();
  const sitecoreContextId = requireContextId(appCtx);

  // TODO (OQ-7): derive site name and collection dynamically.
  // For now, use the app name from appCtx which maps to the site name on the tenant
  // that performed capture point #1 (solo-website, collection: solo).
  // Operator must override these with real values after Tranche 6 smoke.
  const appName = appCtx?.name ?? "solo-website";
  const siteName = appName;

  // TODO (OQ-7): collection name is hardcoded as 'solo' — derived from capture.
  // Real tenants may have different collection names. Tranche 6 will capture this.
  const collectionName = "solo";
  const sitePath = `/sitecore/content/${collectionName}/${siteName}/Settings/Redirects`;

  return (
    <main className="p-3">
      <DashboardWidget
        client={client}
        sitecoreContextId={sitecoreContextId}
        siteName={siteName}
        sitePath={sitePath}
      />
    </main>
  );
}
