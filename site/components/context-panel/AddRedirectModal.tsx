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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REDIRECT_TYPES, redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RedirectMapItem, RedirectType } from "@/lib/domain/types";

/**
 * Direction of the redirect relative to the current page.
 * - "from" — current page is the SOURCE (visitors leave this page; default)
 * - "to"   — current page is the TARGET (visitors land HERE from elsewhere)
 */
export type RedirectDirection = "from" | "to";

export interface AddRedirectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageRoute: string;
  existingMaps: RedirectMapItem[];
  /** Called on successful add — triggers list refresh + canvas reload */
  onSuccess: () => void;
  /** Called to execute write operations.
   *  `source` and `target` already reflect the operator's direction choice —
   *  the caller does NOT need to know which one was pre-populated.
   */
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
  /** Direction relative to the current page. "from" = current page is source (default). */
  const [direction, setDirection] = useState<RedirectDirection>("from");
  /** The user-typed counterpart URL — semantics flip based on `direction`. */
  const [otherUrl, setOtherUrl] = useState("");
  const [newMapName, setNewMapName] = useState("");
  const [newRedirectType, setNewRedirectType] = useState<RedirectType | "">("");
  const [newPreserveQS, setNewPreserveQS] = useState(false);
  const [newPreserveLang, setNewPreserveLang] = useState(false);
  const [newIncludeVF, setNewIncludeVF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Resolve { source, target } from direction + pageRoute + otherUrl. */
  function resolvedPair(): { source: string; target: string } {
    return direction === "from"
      ? { source: pageRoute, target: otherUrl.trim() }
      : { source: otherUrl.trim(), target: pageRoute };
  }

  function isDirty(): boolean {
    if (step === "add-existing") return otherUrl.trim().length > 0;
    if (step === "create-new") return newMapName.trim().length > 0 || otherUrl.trim().length > 0;
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
      setDirection("from");
      setOtherUrl("");
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
    if (!selectedMap || !otherUrl.trim()) {
      setError(direction === "from" ? "Target URL is required." : "Source URL is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // TODO (Tranche 6): write surface assumed-shape — updateRedirectMap must
      // append the new mapping to selectedMap.mappings then serialize.
      const { source, target } = resolvedPair();
      await onAddToExistingMap(selectedMap.id, source, target, selectedMap);
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
    const { source, target } = resolvedPair();
    if (!source.trim() || !target.trim()) { setError("Source and target are required."); return; }
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
        source,
        target,
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
            direction={direction}
            onDirectionChange={setDirection}
            otherUrl={otherUrl}
            onOtherUrlChange={setOtherUrl}
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
            direction={direction}
            onDirectionChange={setDirection}
            otherUrl={otherUrl}
            onOtherUrlChange={setOtherUrl}
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

/**
 * Direction picker — "From this page" (current page is source — default)
 * vs "To this page" (current page is target). A valid redirect can land
 * either way; operator decides per mapping.
 */
function DirectionTabs({
  value,
  onValueChange,
}: {
  value: RedirectDirection;
  onValueChange: (v: RedirectDirection) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>Direction</Label>
      <Tabs value={value} onValueChange={(v) => onValueChange(v as RedirectDirection)}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="from">From this page</TabsTrigger>
          <TabsTrigger value="to">To this page</TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        {value === "from"
          ? "Visitors hitting this page get redirected to your target URL."
          : "Visitors hitting another URL get redirected to this page."}
      </p>
    </div>
  );
}

function AddExistingStep({
  pageRoute,
  direction,
  onDirectionChange,
  otherUrl,
  onOtherUrlChange,
  selectedMap,
  error,
  saving,
  onSave,
  onBack,
}: {
  pageRoute: string;
  direction: RedirectDirection;
  onDirectionChange: (v: RedirectDirection) => void;
  otherUrl: string;
  onOtherUrlChange: (v: string) => void;
  selectedMap: RedirectMapItem;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  const otherLabel = direction === "from" ? "Target" : "Source";
  const otherPlaceholder = direction === "from" ? "/destination-path" : "/origin-path";
  return (
    <div className="space-y-3">
      <DirectionTabs value={direction} onValueChange={onDirectionChange} />
      {direction === "from" ? (
        <>
          <div className="space-y-1">
            <Label>Source (this page)</Label>
            <Input value={pageRoute} readOnly className="bg-muted font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="add-existing-other">{otherLabel}</Label>
            <Input
              id="add-existing-other"
              value={otherUrl}
              onChange={(e) => onOtherUrlChange(e.target.value)}
              placeholder={otherPlaceholder}
              className="font-mono text-xs"
              autoFocus
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="add-existing-other">{otherLabel}</Label>
            <Input
              id="add-existing-other"
              value={otherUrl}
              onChange={(e) => onOtherUrlChange(e.target.value)}
              placeholder={otherPlaceholder}
              className="font-mono text-xs"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Target (this page)</Label>
            <Input value={pageRoute} readOnly className="bg-muted font-mono text-xs" />
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Type: {redirectTypeDisplayName(selectedMap.redirectType)} ·{" "}
        Inherits map flags.
      </p>
      {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving || !otherUrl.trim()} className="flex-1">
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
  direction,
  onDirectionChange,
  otherUrl,
  onOtherUrlChange,
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
  direction: RedirectDirection;
  onDirectionChange: (v: RedirectDirection) => void;
  otherUrl: string;
  onOtherUrlChange: (v: string) => void;
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
  const otherLabel = direction === "from" ? "First mapping — target" : "First mapping — source";
  const otherPlaceholder = direction === "from" ? "/destination-path" : "/origin-path";
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
      <DirectionTabs value={direction} onValueChange={onDirectionChange} />
      {direction === "from" ? (
        <>
          <div className="space-y-1">
            <Label>First mapping — source (this page)</Label>
            <Input value={pageRoute} readOnly className="bg-muted font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-map-other">{otherLabel}</Label>
            <Input
              id="new-map-other"
              value={otherUrl}
              onChange={(e) => onOtherUrlChange(e.target.value)}
              placeholder={otherPlaceholder}
              className="font-mono text-xs"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="new-map-other">{otherLabel}</Label>
            <Input
              id="new-map-other"
              value={otherUrl}
              onChange={(e) => onOtherUrlChange(e.target.value)}
              placeholder={otherPlaceholder}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label>First mapping — target (this page)</Label>
            <Input value={pageRoute} readOnly className="bg-muted font-mono text-xs" />
          </div>
        </>
      )}
      {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button
          onClick={onSave}
          disabled={saving || !name.trim() || !redirectType || !otherUrl.trim()}
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
