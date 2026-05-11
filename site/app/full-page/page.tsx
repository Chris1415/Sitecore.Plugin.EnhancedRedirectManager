"use client";

/**
 * Full Page extension point (xmc:fullscreen).
 * Route: /full-page
 *
 * TEMPORARY — Tranche 2 capture helper. Auto-fetches sites/collections
 * (same as dashboard-widget), plus a path-input + manual-trigger fetcher
 * for the Authoring GraphQL children-list at
 * /sitecore/content/{COLLECTION}/{SITE}/Settings/Redirects. Operator types
 * the real path for their tenant, clicks Re-fetch, copies the JSON into
 * tests/fixtures/graphql/redirect-map-list.json.
 *
 * Tranches 5–7 replace this with the real Full Page UI (collection→site
 * picker, virtualized redirect-map list, CRUD forms, import/export).
 */

import { useState } from "react";
import {
  useAppContext,
  useMarketplaceClient,
} from "@/components/providers/marketplace";
import { listCollections, listSites } from "@/lib/sdk/sites";
import { fetchRedirectMapsRaw, GET_REDIRECTS_FOR_SITE } from "@/lib/sdk/redirects-read";
import { requireContextId } from "@/lib/sdk/require-context-id";
import { CaptureHelper } from "@/components/dev/capture-helper";

const DEFAULT_PATH =
  "/sitecore/content/<COLLECTION>/<SITE>/Settings/Redirects";

export default function FullPagePage() {
  const client = useMarketplaceClient();
  const appCtx = useAppContext();
  const sitecoreContextId = requireContextId(appCtx);
  const [sitePath, setSitePath] = useState(DEFAULT_PATH);

  return (
    <main className="p-4 max-w-4xl">
      <h1 className="text-lg font-semibold">Full Page — capture helper</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-4">
        Same sites + collections probes as the dashboard, plus a manual
        Authoring GraphQL probe for the Redirect Maps under a chosen site.
        Tranches 5–7 replace this with the real Full Page UI.
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

      <CaptureHelper
        label="xmc.authoring.graphql — Redirect Map children"
        fixtureFile="redirect-map-list.json"
        autoFetch={false}
        fetcher={async () => {
          if (sitePath === DEFAULT_PATH) {
            throw new Error(
              "Replace <COLLECTION>/<SITE> with your tenant's actual collection + site names, then click Re-fetch. Hint: take one of the names from the listSites response above.",
            );
          }
          // Returns the raw Authoring GraphQL response (single .data envelope plus inner
          // item.children.results). This IS the wire shape to paste into the fixture file.
          return fetchRedirectMapsRaw(client, sitecoreContextId, sitePath);
        }}
      >
        <label className="block text-sm mb-1" htmlFor="site-path-input">
          Sitecore content path:
        </label>
        <input
          id="site-path-input"
          type="text"
          value={sitePath}
          onChange={(e) => setSitePath(e.target.value)}
          className="w-full text-xs font-mono rounded border border-input px-2 py-1 mb-2"
        />
        <p className="text-xs text-muted-foreground mb-2">
          The JSON below is the <strong>raw wire shape</strong> — the full
          Authoring GraphQL response. Copy it verbatim into the fixture file.
        </p>
        <details className="mt-2 mb-2">
          <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
            Show GraphQL query
          </summary>
          <pre className="text-xs bg-muted/40 border border-border rounded p-2 mt-1 whitespace-pre overflow-auto">
            {GET_REDIRECTS_FOR_SITE.trim()}
          </pre>
          <p className="text-xs text-muted-foreground mt-1">
            Variables: <code>{`{ "sitePath": "${sitePath}" }`}</code>
          </p>
        </details>
      </CaptureHelper>
    </main>
  );
}
