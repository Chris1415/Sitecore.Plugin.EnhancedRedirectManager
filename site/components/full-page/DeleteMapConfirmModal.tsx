"use client";

/**
 * T041 — DeleteMapConfirmModal
 *
 * Two-step confirmation modal for deleting a Redirect Map item.
 * Shows the map name + mapping count, requires explicit confirm click.
 *
 * Wired to deleteRedirectMap (lib/sdk/redirects-write.ts).
 * Verified envelope shape from Tranche 6a capture session.
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteRedirectMap } from "@/lib/sdk/redirects-write";
import type { ClientSDK } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";
import { toast } from "sonner";

interface DeleteMapConfirmModalProps {
  client: ClientSDK;
  sitecoreContextId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: RedirectMapItem | null;
  /** Called after a successful delete with the deleted map's id. */
  onDeleted: (deletedMapId: string) => void;
}

export function DeleteMapConfirmModal({
  client,
  sitecoreContextId,
  open,
  onOpenChange,
  map,
  onDeleted,
}: DeleteMapConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!map) return;
    setSubmitting(true);
    try {
      const result = await deleteRedirectMap(client, sitecoreContextId, map.id);
      if (result.ok) {
        toast.success(`Deleted "${map.name}"`);
        onDeleted(map.id);
        onOpenChange(false);
      } else {
        toast.error("Delete failed", {
          description: "The server returned an unsuccessful response.",
        });
      }
    } catch (error) {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this redirect map?</AlertDialogTitle>
          <AlertDialogDescription>
            {map ? (
              <>
                <span className="font-mono font-medium text-foreground">{map.name}</span>
                {" "}has {map.mappings.length} {map.mappings.length === 1 ? "mapping" : "mappings"}.
                This cannot be undone.
              </>
            ) : (
              "No map selected."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting || !map}>
            {submitting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
