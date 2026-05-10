/**
 * T015 — lib/sdk/canvas-reload.ts
 *
 * No assumed-shape annotation (void return, no fixture).
 * Source: sitecore:marketplace-sdk-client base MutationMap ('pages.reloadCanvas' → void).
 *
 * Note (cite § 4c-6.7): errors are swallowed and logged — canvas reload is a UX nicety.
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { reloadPagesCanvas } from '@/lib/sdk/canvas-reload';

type MutateFn = ClientSDK['mutate'];

describe('reloadPagesCanvas', () => {
  it('RED-1: fires client.mutate("pages.reloadCanvas")', async () => {
    const mutate: Mock<MutateFn> = vi.fn<MutateFn>().mockResolvedValueOnce(undefined as never);
    const client = { mutate } as unknown as ClientSDK;

    await reloadPagesCanvas(client);

    expect(mutate).toHaveBeenCalledWith('pages.reloadCanvas');
  });

  it('RED-2: swallows and logs errors — does NOT propagate', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mutate: Mock<MutateFn> = vi.fn<MutateFn>().mockRejectedValueOnce(new Error('network failure') as never);
    const client = { mutate } as unknown as ClientSDK;

    // Must resolve (not throw) even when mutate rejects
    await expect(reloadPagesCanvas(client)).resolves.toBeUndefined();

    // Must log the error
    expect(consoleErrorSpy).toHaveBeenCalledOnce();

    consoleErrorSpy.mockRestore();
  });
});
