"use client";

/**
 * T040 + T046 — NewRedirectMapModal
 *
 * Modal for creating a new Redirect Map under the current site's Settings/Redirects folder.
 *
 * Flow:
 *   1. Modal opens — fire parallel discovery queries (parentId by path + templateId from children).
 *   2. Once both resolve, show the create form: name, RedirectType, three flag toggles.
 *   3. Submit → createRedirectMap → toast → notify parent for refetch + selection.
 *
 * If template discovery fails (no existing maps under the parent to introspect from),
 * surface a guidance error: the operator has to seed the very first map manually in
 * Sitecore CMS before subsequent maps can be created via this UI.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createRedirectMap } from "@/lib/sdk/redirects-write";
import {
  resolveItemIdByPath,
  discoverRedirectMapTemplateId,
} from "@/lib/sdk/redirects-discover";
import {
  REDIRECT_TYPES,
  redirectTypeDisplayName,
} from "@/lib/redirects/redirect-type-enum";
import type { ClientSDK } from "@/lib/sdk/types";
import type { RedirectType } from "@/lib/domain/types";
import { toast } from "sonner";

interface NewRedirectMapModalProps {
  client: ClientSDK;
  sitecoreContextId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Full Sitecore path to Settings/Redirects for the current site */
  sitePath: string | null;
  /** Called after a successful create with the new map's itemId. */
  onCreated: (newMapId: string, newMapName: string) => void;
}

type DiscoveryState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; parentId: string; templateId: string }
  | { kind: "missing-parent" }
  | { kind: "missing-template" }
  | { kind: "error"; message: string };

export function NewRedirectMapModal({
  client,
  sitecoreContextId,
  open,
  onOpenChange,
  sitePath,
  onCreated,
}: NewRedirectMapModalProps) {
  const [discovery, setDiscovery] = useState<DiscoveryState>({ kind: "idle" });
  const [name, setName] = useState("");
  const [redirectType, setRedirectType] = useState<RedirectType>("ServerTransfer");
  const [preserveQueryString, setPreserveQueryString] = useState(false);
  const [preserveLanguage, setPreserveLanguage] = useState(false);
  const [includeVirtualFolder, setIncludeVirtualFolder] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const runDiscovery = useCallback(async () => {
    if (!sitePath) return;
    setDiscovery({ kind: "loading" });
    try {
      const parentId = await resolveItemIdByPath(client, sitecoreContextId, sitePath);
      if (!parentId) {
        setDiscovery({ kind: "missing-parent" });
        return;
      }
      const templateId = await discoverRedirectMapTemplateId(
        client,
        sitecoreContextId,
        parentId,
      );
      if (!templateId) {
        setDiscovery({ kind: "missing-template" });
        return;
      }
      setDiscovery({ kind: "ready", parentId, templateId });
    } catch (error) {
      setDiscovery({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [client, sitecoreContextId, sitePath]);

  useEffect(() => {
    if (open) {
      // IIFE pattern to satisfy react-hooks/set-state-in-effect.
      (async () => {
        await runDiscovery();
      })();
    } else {
      // Reset form on close. setState in effect is fine here — we are
      // synchronising local form state with the external `open` toggle.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDiscovery({ kind: "idle" });
      setName("");
      setRedirectType("ServerTransfer");
      setPreserveQueryString(false);
      setPreserveLanguage(false);
      setIncludeVirtualFolder(false);
    }
  }, [open, runDiscovery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (discovery.kind !== "ready") return;
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const result = await createRedirectMap(client, sitecoreContextId, {
        parentId: discovery.parentId,
        templateId: discovery.templateId,
        name: name.trim(),
        redirectType,
        preserveQueryString,
        preserveLanguage,
        includeVirtualFolder,
        mappings: [],
      });
      if (result.ok && result.itemId) {
        toast.success(`Created "${result.name ?? name.trim()}"`);
        onCreated(result.itemId, result.name ?? name.trim());
        onOpenChange(false);
      } else {
        toast.error("Create failed", {
          description: "The server returned no itemId.",
        });
      }
    } catch (error) {
      toast.error("Create failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    discovery.kind === "ready" && name.trim().length > 0 && !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New redirect map</DialogTitle>
          <DialogDescription>
            Creates a new Redirect Map under the current site&apos;s Settings/Redirects folder.
          </DialogDescription>
        </DialogHeader>

        {discovery.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Resolving site folder and template…</p>
        )}

        {discovery.kind === "missing-parent" && (
          <Alert variant="danger">
            <AlertDescription>
              Settings/Redirects folder not found for this site. Verify the path:
              <code className="ml-1 font-mono text-xs">{sitePath}</code>
            </AlertDescription>
          </Alert>
        )}

        {discovery.kind === "missing-template" && (
          <Alert variant="danger">
            <AlertDescription>
              No existing Redirect Map found under the parent folder, so the template
              GUID can&apos;t be discovered. Create the first Redirect Map manually
              in Sitecore CMS, then return here to create subsequent maps.
            </AlertDescription>
          </Alert>
        )}

        {discovery.kind === "error" && (
          <Alert variant="danger">
            <AlertDescription>
              Discovery failed: {discovery.message}
            </AlertDescription>
          </Alert>
        )}

        {discovery.kind === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-map-name">Name</Label>
              <Input
                id="new-map-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
                placeholder="My Redirect Map"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-map-type">Type</Label>
              <Select
                value={redirectType}
                onValueChange={(value) => setRedirectType(value as RedirectType)}
              >
                <SelectTrigger id="new-map-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REDIRECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {redirectTypeDisplayName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Flags</legend>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preserveQueryString}
                  onCheckedChange={(v) => setPreserveQueryString(v === true)}
                />
                <span className="text-sm">Preserve query string</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preserveLanguage}
                  onCheckedChange={(v) => setPreserveLanguage(v === true)}
                />
                <span className="text-sm">Preserve language</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeVirtualFolder}
                  onCheckedChange={(v) => setIncludeVirtualFolder(v === true)}
                />
                <span className="text-sm">Include virtual folder</span>
              </label>
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
