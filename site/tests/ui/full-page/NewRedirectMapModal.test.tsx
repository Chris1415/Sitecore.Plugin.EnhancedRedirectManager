/**
 * NewRedirectMapModal tests — Tranche 6b.
 *
 * Verifies the discovery-error states and that the form only renders
 * after parent + template discovery resolves successfully.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { NewRedirectMapModal } from "@/components/full-page/NewRedirectMapModal";
import type { ClientSDK } from "@/lib/sdk/types";

function makeClient(
  resolveItemResponse: unknown,
  discoverChildrenResponse: unknown,
): ClientSDK {
  // Two sequential mutate calls: first resolves parent path, second resolves template via children.
  const mutate = vi
    .fn()
    .mockResolvedValueOnce(resolveItemResponse)
    .mockResolvedValueOnce(discoverChildrenResponse);
  return {
    mutate,
    query: vi.fn(),
    subscribe: vi.fn(),
  } as unknown as ClientSDK;
}

describe("NewRedirectMapModal", () => {
  it("shows discovery loading state when modal opens", async () => {
    const client = makeClient(
      new Promise(() => {}), // never resolves
      new Promise(() => {}),
    );
    render(
      <NewRedirectMapModal
        client={client}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        sitePath="/sitecore/content/x/y/Settings/Redirects"
        onCreated={() => {}}
      />,
    );
    expect(screen.getByText(/resolving site folder and template/i)).toBeDefined();
  });

  it("shows missing-parent error when parent path doesn't resolve", async () => {
    const client = makeClient(
      { data: { data: { item: null } } },
      { data: { data: { item: { children: { nodes: [] } } } } },
    );
    render(
      <NewRedirectMapModal
        client={client}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        sitePath="/sitecore/content/x/y/Settings/Redirects"
        onCreated={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/folder not found for this site/i)).toBeDefined();
    });
  });

  it("shows missing-template error when no Redirect Map child exists under parent", async () => {
    const client = makeClient(
      { data: { data: { item: { itemId: "parent-1" } } } },
      { data: { data: { item: { children: { nodes: [] } } } } },
    );
    render(
      <NewRedirectMapModal
        client={client}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        sitePath="/sitecore/content/x/y/Settings/Redirects"
        onCreated={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/template GUID can't be discovered/i)).toBeDefined();
    });
  });

  it("renders the create form when discovery succeeds", async () => {
    const client = makeClient(
      { data: { data: { item: { itemId: "parent-1" } } } },
      {
        data: {
          data: {
            item: {
              children: {
                nodes: [
                  {
                    itemId: "child-1",
                    name: "Existing map",
                    template: { templateId: "tpl-1", name: "Redirect Map" },
                  },
                ],
              },
            },
          },
        },
      },
    );
    render(
      <NewRedirectMapModal
        client={client}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        sitePath="/sitecore/content/x/y/Settings/Redirects"
        onCreated={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/^name$/i)).toBeDefined();
    });
    expect(screen.getByRole("button", { name: /create/i })).toBeDefined();
  });
});
