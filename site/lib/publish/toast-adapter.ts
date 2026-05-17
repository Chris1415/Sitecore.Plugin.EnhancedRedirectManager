/**
 * T010 — Sonner-backed ToastAdapter.
 *
 * Wraps the existing `sonner` toast surface (already a PRD-000 dep at ^2.0.7)
 * into the ToastAdapter interface from ADR-0033 § 5.
 *
 * Three states for every publish flow:
 *   requested → toast.loading (transient spinner)
 *   queued    → toast.success replacing the loading toast (by id)
 *   failed    → toast.error  replacing the loading toast (by id)
 *
 * The adapter does NOT introduce any new toast styles — Sonner defaults only.
 *
 * ADR-0033 § 5.
 */

import { toast } from "sonner";
import type { ToastAdapter } from "./types";

/**
 * Create a production Sonner-backed ToastAdapter.
 * Call once at the React call site (not inside render) to obtain a stable adapter.
 */
export function createSonnerToastAdapter(): ToastAdapter {
  return {
    requested(message: string): string | number {
      return toast.loading(message);
    },

    queued(message: string, opts?: { dismissId?: string | number }): void {
      toast.success(message, { id: opts?.dismissId });
    },

    failed(message: string, opts?: { dismissId?: string | number }): void {
      toast.error(message, { id: opts?.dismissId });
    },
  };
}
