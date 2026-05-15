/**
 * EditMapSettingsModal — Tranche 4 fix-up #2 + T030 V4 re-skin (Epic E, T4)
 *
 * Operator-facing modal for editing the MAP-LEVEL attributes of an existing
 * Redirect Map (name, RedirectType, 3 boolean flags). Mappings themselves are
 * not touched here — they are edited inline via MatchedMapGroup rows.
 *
 * V4 update (T030): .elev-glass-surface applied to dialog shell.
 * Title remains utility voice per ADR-0029 D5.
 * Form logic + validation + updateRedirectMap call site unchanged.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { REDIRECT_TYPES, redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RedirectMapItem, RedirectType } from "@/lib/domain/types";

export interface EditMapSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: RedirectMapItem | null;
  onSave: (attrs: {
    name: string;
    redirectType: RedirectType;
    preserveQueryString: boolean;
    preserveLanguage: boolean;
    includeVirtualFolder: boolean;
  }) => Promise<void>;
}

export function EditMapSettingsModal({
  open,
  onOpenChange,
  map,
  onSave,
}: EditMapSettingsModalProps) {
  const [name, setName] = useState("");
  const [redirectType, setRedirectType] = useState<RedirectType | "">("");
  const [preserveQS, setPreserveQS] = useState(false);
  const [preserveLang, setPreserveLang] = useState(false);
  const [includeVF, setIncludeVF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate form fields whenever the modal is opened with a fresh map.
  // Wrapped in a callback per react-hooks/set-state-in-effect — sibling pattern
  // established in FullPage.tsx and other in-repo effects.
  useEffect(() => {
    const hydrate = () => {
      if (open && map) {
        setName(map.name);
        setRedirectType(map.redirectType);
        setPreserveQS(map.preserveQueryString);
        setPreserveLang(map.preserveLanguage);
        setIncludeVF(map.includeVirtualFolder);
        setError(null);
      }
    };
    hydrate();
  }, [open, map]);

  function isDirty(): boolean {
    if (!map) return false;
    return (
      name.trim() !== map.name ||
      redirectType !== map.redirectType ||
      preserveQS !== map.preserveQueryString ||
      preserveLang !== map.preserveLanguage ||
      includeVF !== map.includeVirtualFolder
    );
  }

  function handleOpenChange(next: boolean) {
    if (!next && isDirty()) {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    onOpenChange(next);
  }

  async function handleSave() {
    if (!map) return;
    if (!name.trim()) { setError("Name is required."); return; }
    if (!redirectType) { setError("Redirect type is required."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        redirectType: redirectType as RedirectType,
        preserveQueryString: preserveQS,
        preserveLanguage: preserveLang,
        includeVirtualFolder: includeVF,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" className="max-w-sm elev-glass-surface elev-modal-content">
        <DialogHeader>
          <DialogTitle>Edit map settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="edit-map-name">Map name</Label>
            <Input
              id="edit-map-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Redirect type</Label>
            <Select
              value={redirectType}
              onValueChange={(v) => setRedirectType(v as RedirectType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a type…" />
              </SelectTrigger>
              <SelectContent>
                {REDIRECT_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>
                    {redirectTypeDisplayName(rt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-pqs"
                checked={preserveQS}
                onCheckedChange={(v) => setPreserveQS(Boolean(v))}
              />
              <Label htmlFor="edit-pqs" className="text-sm font-normal">Preserve Query String</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-plang"
                checked={preserveLang}
                onCheckedChange={(v) => setPreserveLang(Boolean(v))}
              />
              <Label htmlFor="edit-plang" className="text-sm font-normal">Preserve Language</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-ivf"
                checked={includeVF}
                onCheckedChange={(v) => setIncludeVF(Boolean(v))}
              />
              <Label htmlFor="edit-ivf" className="text-sm font-normal">Include Virtual Folder</Label>
            </div>
          </div>
          {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !redirectType}
              className="flex-1"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
