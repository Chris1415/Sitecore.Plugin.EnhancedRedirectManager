"use client";

/**
 * Context Panel extension point (xmc:pages:contextpanel).
 * Route: /context-panel
 *
 * TEMPORARY — Tranche 2 capture helper. Subscribes to pages.context and
 * renders the captured PagesContext so the operator can paste it into
 * tests/fixtures/graphql/page-context.json. Tranche 4 (T022–T030) replaces
 * this with the real Context Panel UI (grouped matched-redirects list,
 * inline edit/delete, add-redirect modal).
 *
 * Note: pages.context only fires meaningful data when the app is loaded
 * as an iframe inside the Pages editor on a real Cloud Portal Test App.
 * Loaded standalone at http://localhost:3001/context-panel you'll see the
 * Provider error banner ("not bound to parent") — that's expected.
 */

import { useEffect, useState } from "react";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { subscribePageContext, type PagesContext } from "@/lib/sdk/page-context";
import { CaptureHelper } from "@/components/dev/capture-helper";

export default function ContextPanelPage() {
  const client = useMarketplaceClient();
  const [ctx, setCtx] = useState<PagesContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    (async () => {
      try {
        unsubscribe = await subscribePageContext(client, (next) => {
          if (active) setCtx(next);
        });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [client]);

  return (
    <main className="p-4 max-w-3xl">
      <h1 className="text-lg font-semibold">Context Panel — capture helper</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-4">
        Subscribes to <code>pages.context</code>. Open this in the Pages editor
        (as the Page Context Panel iframe) to populate it. The full Context
        Panel UI ships in Tranche 4.
      </p>

      <CaptureHelper
        label="pages.context"
        fixtureFile="page-context.json"
        autoFetch={false}
        fetcher={async () => {
          if (error) throw new Error(error);
          if (!ctx) {
            throw new Error(
              "No PagesContext received yet. Open this iframe inside the Pages editor on a real page. (When loaded standalone outside the Cloud Portal iframe, the SDK has no parent and pages.context never fires.)",
            );
          }
          return ctx;
        }}
      >
        <div className="text-xs text-muted-foreground mb-2">
          {ctx ? (
            <>Last update received — click <strong>Re-fetch</strong> to refresh the JSON.</>
          ) : error ? (
            <>Error: <code>{error}</code></>
          ) : (
            <>Waiting for first <code>pages.context</code> message…</>
          )}
        </div>
      </CaptureHelper>
    </main>
  );
}
