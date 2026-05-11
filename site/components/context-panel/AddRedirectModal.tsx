/**
 * AddRedirectModal — T024
 *
 * Two-step modal for adding a redirect for the current page.
 *
 * Step 1: Searchable Command list of existing maps + "+ Create new Redirect Map" at top.
 * Step 2a (existing map): form with read-only source pre-populated to pageRoute + target input.
 * Step 2b (create new): fuller form with name, RedirectType select, 3 flag checkboxes + first mapping.
 *
 * WRITE NOTE (Tranche 6): write operations are assumed-shape pending real-tenant capture.
 * createRedirectMap and updateRedirectMap calls are marked with TODO comments.
 * The parentId and templateId are PLACEHOLDER values — the operator must supply real ones
 * after the Tranche 6 Settings/Redirects folder GUID is captured.
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Badge } from "@/components/ui/badge";
import { REDIRECT_TYPES, redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RedirectMapItem, RedirectType } from "@/lib/domain/types";

export interface AddRedirectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageRoute: string;
  existingMaps: RedirectMapItem[];
  /** Called on successful add — triggers list refresh + canvas reload */
  onSuccess: () => void;
  /** Called to execute write operations */
  onAddToExistingMap: (
    mapId: string,
    source: string,
    target: string,
    existingMap: RedirectMapItem
  ) => Promise<void>;
  onCreateNewMap: (attrs: {
    name: string;
    redirectType: RedirectType;
    preserveQueryString: boolean;
    preserveLanguage: boolean;
    includeVirtualFolder: boolean;
    source: string;
    target: string;
  }) => Promise<void>;
}

type Step = "pick" | "add-existing" | "create-new";

export function AddRedirectModal({
  open,
  onOpenChange,
  pageRoute,
  existingMaps,
  onSuccess,
  onAddToExistingMap,
  onCreateNewMap,
}: AddRedirectModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [selectedMap, setSelectedMap] = useState<RedirectMapItem | null>(null);
  const [target, setTarget] = useState("");
  const [newMapName, setNewMapName] = useState("");
  const [newRedirectType, setNewRedirectType] = useState<RedirectType | "">("");
  const [newPreserveQS, setNewPreserveQS] = useState(false);
  const [newPreserveLang, setNewPreserveLang] = useState(false);
  const [newIncludeVF, setNewIncludeVF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isDirty(): boolean {
    if (step === "add-existing") return target.trim().length > 0;
    if (step === "create-new") return newMapName.trim().length > 0 || target.trim().length > 0;
    return false;
  }

  function handleOpenChange(next: boolean) {
    if (!next && isDirty()) {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    if (!next) {
      // Reset state on close
      setStep("pick");
      setSelectedMap(null);
      setTarget("");
      setNewMapName("");
      setNewRedirectType("");
      setError(null);
    }
    onOpenChange(next);
  }

  function handlePickMap(map: RedirectMapItem) {
    setSelectedMap(map);
    setStep("add-existing");
  }

  function handlePickCreateNew() {
    setStep("create-new");
  }

  async function handleSaveExisting() {
    if (!selectedMap || !target.trim()) {
      setError("Target URL is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // TODO (Tranche 6): write surface assumed-shape — updateRedirectMap must
      // append the new mapping to selectedMap.mappings then serialize.
      await onAddToExistingMap(selectedMap.id, pageRoute, target.trim(), selectedMap);
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNew() {
    if (!newMapName.trim()) { setError("Name is required."); return; }
    if (!newRedirectType) { setError("Redirect type is required."); return; }
    if (!pageRoute.trim() || !target.trim()) { setError("Source and target are required."); return; }
    setSaving(true);
    setError(null);
    try {
      // TODO (Tranche 6): createRedirectMap assumed-shape — parentId/templateId are placeholders
      await onCreateNewMap({
        name: newMapName.trim(),
        redirectType: newRedirectType as RedirectType,
        preserveQueryString: newPreserveQS,
        preserveLanguage: newPreserveLang,
        includeVirtualFolder: newIncludeVF,
        source: pageRoute,
        target: target.trim(),
      });
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {step === "pick"
              ? `Add a redirect for ${pageRoute}`
              : step === "add-existing"
              ? `Add to "${selectedMap?.name}"`
              : "Create new Redirect Map"}
          </DialogTitle>
        </DialogHeader>

        {step === "pick" && (
          <PickStep
            existingMaps={existingMaps}
            onPickMap={handlePickMap}
            onPickCreateNew={handlePickCreateNew}
          />
        )}

        {step === "add-existing" && selectedMap && (
          <AddExistingStep
            pageRoute={pageRoute}
            target={target}
            onTargetChange={setTarget}
            selectedMap={selectedMap}
            error={error}
            saving={saving}
            onSave={handleSaveExisting}
            onBack={() => setStep("pick")}
          />
        )}

        {step === "create-new" && (
          <CreateNewStep
            pageRoute={pageRoute}
            target={target}
            onTargetChange={setTarget}
            name={newMapName}
            onNameChange={setNewMapName}
            redirectType={newRedirectType}
            onRedirectTypeChange={(v) => setNewRedirectType(v as RedirectType)}
            preserveQS={newPreserveQS}
            onPreserveQSChange={setNewPreserveQS}
            preserveLang={newPreserveLang}
            onPreserveLangChange={setNewPreserveLang}
            includeVF={newIncludeVF}
            onIncludeVFChange={setNewIncludeVF}
            error={error}
            saving={saving}
            onSave={handleSaveNew}
            onBack={() => setStep("pick")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---- Sub-components ----

function PickStep({
  existingMaps,
  onPickMap,
  onPickCreateNew,
}: {
  existingMaps: RedirectMapItem[];
  onPickMap: (map: RedirectMapItem) => void;
  onPickCreateNew: () => void;
}) {
  return (
    <Command className="rounded-md border">
      <CommandInput placeholder="Search maps…" />
      <CommandList>
        <CommandEmpty>No maps found.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            onSelect={onPickCreateNew}
            className="font-medium text-primary"
          >
            + Create new Redirect Map
          </CommandItem>
          {existingMaps.map((map) => (
            <CommandItem
              key={map.id}
              onSelect={() => onPickMap(map)}
            >
              <span>{map.name}</span>
              <Badge colorScheme="neutral" size="sm" className="ml-auto font-normal">
                {redirectTypeDisplayName(map.redirectType)}
              </Badge>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function AddExistingStep({
  pageRoute,
  target,
  onTargetChange,
  selectedMap,
  error,
  saving,
  onSave,
  onBack,
}: {
  pageRoute: string;
  target: string;
  onTargetChange: (v: string) => void;
  selectedMap: RedirectMapItem;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Source (pre-populated)</Label>
        <Input value={pageRoute} readOnly className="bg-muted font-mono text-xs" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="add-existing-target">Target</Label>
        <Input
          id="add-existing-target"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder="/destination-path"
          className="font-mono text-xs"
          autoFocus
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Type: {redirectTypeDisplayName(selectedMap.redirectType)} ·{" "}
        Inherits map flags.
      </p>
      {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving || !target.trim()} className="flex-1">
          {saving ? "Saving…" : "Add redirect"}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={saving}>
          Back
        </Button>
      </div>
    </div>
  );
}

function CreateNewStep({
  pageRoute,
  target,
  onTargetChange,
  name,
  onNameChange,
  redirectType,
  onRedirectTypeChange,
  preserveQS,
  onPreserveQSChange,
  preserveLang,
  onPreserveLangChange,
  includeVF,
  onIncludeVFChange,
  error,
  saving,
  onSave,
  onBack,
}: {
  pageRoute: string;
  target: string;
  onTargetChange: (v: string) => void;
  name: string;
  onNameChange: (v: string) => void;
  redirectType: string;
  onRedirectTypeChange: (v: string) => void;
  preserveQS: boolean;
  onPreserveQSChange: (v: boolean) => void;
  preserveLang: boolean;
  onPreserveLangChange: (v: boolean) => void;
  includeVF: boolean;
  onIncludeVFChange: (v: boolean) => void;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="new-map-name">Map name</Label>
        <Input
          id="new-map-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My Redirect Map"
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <Label>Redirect type</Label>
        <Select value={redirectType} onValueChange={onRedirectTypeChange}>
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
            id="new-pqs"
            checked={preserveQS}
            onCheckedChange={(v) => onPreserveQSChange(Boolean(v))}
          />
          <Label htmlFor="new-pqs" className="text-sm font-normal">Preserve Query String</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="new-plang"
            checked={preserveLang}
            onCheckedChange={(v) => onPreserveLangChange(Boolean(v))}
          />
          <Label htmlFor="new-plang" className="text-sm font-normal">Preserve Language</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="new-ivf"
            checked={includeVF}
            onCheckedChange={(v) => onIncludeVFChange(Boolean(v))}
          />
          <Label htmlFor="new-ivf" className="text-sm font-normal">Include Virtual Folder</Label>
        </div>
      </div>
      <div className="space-y-1">
        <Label>First mapping — source</Label>
        <Input value={pageRoute} readOnly className="bg-muted font-mono text-xs" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-map-target">First mapping — target</Label>
        <Input
          id="new-map-target"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder="/destination-path"
          className="font-mono text-xs"
        />
      </div>
      {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button
          onClick={onSave}
          disabled={saving || !name.trim() || !redirectType || !target.trim()}
          className="flex-1"
        >
          {saving ? "Creating…" : "Create map"}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={saving}>
          Back
        </Button>
      </div>
    </div>
  );
}
