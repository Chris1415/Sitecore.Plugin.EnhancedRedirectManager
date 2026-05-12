"use client";

/**
 * Dashboard Widget extension point (xmc:dashboardblocks).
 * Route: /dashboard-widget
 *
 * Tranche 9 update — tenant-wide aggregation.
 *
 * Previous implementation hardcoded the collection name to "solo" and assumed
 * the Cloud Portal app name matched a Sitecore site name. That broke for every
 * tenant that wasn't the original capture target. Now the widget enumerates
 * every site in the tenant via xmc.sites.listSites, resolves each site's
 * collection name via xmc.sites.listCollections, fetches its Redirect Maps
 * in parallel, and shows the totals across the entire tenant.
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

  return (
    <main className="p-3">
      <DashboardWidget client={client} sitecoreContextId={sitecoreContextId} />
    </main>
  );
}
