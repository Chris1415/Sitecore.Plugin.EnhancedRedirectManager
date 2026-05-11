"use client";

/**
 * Dashboard Widget extension point (xmc:dashboardblocks).
 * Route: /dashboard-widget
 *
 * TEMPORARY — Tranche 2 capture helper. Auto-fetches xmc.sites.listSites
 * and xmc.sites.listCollections so the operator can paste both into
 * tests/fixtures/graphql/. Tranche 4 (T031–T034) replaces this with the
 * real Dashboard Widget UI (3 stat tiles + footnote).
 */

import {
  useAppContext,
  useMarketplaceClient,
} from "@/components/providers/marketplace";
import { listCollections, listSites } from "@/lib/sdk/sites";
import { requireContextId } from "@/lib/sdk/require-context-id";
import { CaptureHelper } from "@/components/dev/capture-helper";

export default function DashboardWidgetPage() {
  const client = useMarketplaceClient();
  const appCtx = useAppContext();
  const sitecoreContextId = requireContextId(appCtx);

  return (
    <main className="p-4 max-w-3xl">
      <h1 className="text-lg font-semibold">Dashboard Widget — capture helper</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-4">
        Invokes <code>xmc.sites.listSites</code> and{" "}
        <code>xmc.sites.listCollections</code> against the current tenant.
        Copy the JSON into the fixture file. The full Dashboard Widget UI
        ships in Tranche 4.
      </p>

      <CaptureHelper
        label="xmc.sites.listSites"
        fixtureFile="sites-list.json"
        fetcher={() => listSites(client, sitecoreContextId)}
      />

      <CaptureHelper
        label="xmc.sites.listCollections"
        fixtureFile="collections-list.json"
        fetcher={() => listCollections(client, sitecoreContextId)}
      />
    </main>
  );
}
