/**
 * Re-exports from @sitecore-marketplace-sdk/* for use by components.
 *
 * ADR-0011: Only lib/sdk/* and components/providers/marketplace.tsx may import
 * from @sitecore-marketplace-sdk/*. Components that need SDK types should import
 * from here rather than directly from the SDK package.
 */

export type { ClientSDK } from "@sitecore-marketplace-sdk/client";
export type { Sites } from "@sitecore-marketplace-sdk/xmc";
