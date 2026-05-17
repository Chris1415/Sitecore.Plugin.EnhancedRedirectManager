"use client";

/**
 * T019 — PublishSiteConfirmModal
 *
 * Confirmation dialog for site-wide publish. Shown before calling the SitecoreAI
 * Publishing API. Reuses the AlertDialog primitive shell from DeleteMapConfirmModal.
 *
 * Acceptance criteria verified: AC-P1.2 (dialog body), AC-P1.3 (Confirm/Cancel),
 * AC-P1.7 (disabled while publishing).
 *
 * PRD-003 / ADR-0033.
 */

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

interface PublishSiteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human-readable site display name — shown in dialog body (AC-P1.2a). */
  siteDisplayName: string;
  /** Number of locales being published — shown in dialog body (AC-P1.2b). */
  localeCount: number;
  /** Disables the confirm button while a publish is in flight (AC-P1.7). */
  isPublishing: boolean;
  /** Called when the operator clicks the primary confirm button. */
  onConfirm: () => void;
}

export function PublishSiteConfirmModal({
  open,
  onOpenChange,
  siteDisplayName,
  localeCount,
  isPublishing,
  onConfirm,
}: PublishSiteConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="elev-glass-surface elev-modal-content">
        <AlertDialogHeader>
          {/* AC-P1.2 — dialog title */}
          <AlertDialogTitle>Republish site</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1 text-sm">
              {/* AC-P1.2a */}
              <p>Site: {siteDisplayName}</p>
              {/* AC-P1.2b */}
              <p>Locales: {localeCount} being published</p>
              {/* AC-P1.2c */}
              <p>Mode: Republish (full)</p>
              {/* AC-P1.2d */}
              <p>Source: Redirect Manager</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* AC-P1.3 — Cancel */}
          <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
          {/* AC-P1.3 — Confirm; AC-P1.7 — disabled while publishing */}
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPublishing}
            colorScheme="primary"
          >
            Republish site
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
