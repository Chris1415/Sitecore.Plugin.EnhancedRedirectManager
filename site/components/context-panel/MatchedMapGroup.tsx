/**
 * MatchedMapGroup — T023 (+ Tranche 4 fix-up #2: accordion + map-settings edit)
 *
 * One collapsible card per matched Redirect Map.
 *
 * Header (always visible — also the Collapsible trigger):
 *   chevron + map name + RedirectType badge + flag chips (only for true flags).
 *   Default open. Toggling collapses the body — useful when many maps match.
 *
 * Body (collapsible):
 *   - Matched mapping rows with source → target in monospace.
 *       Matched side: font-medium (weight 500); non-matched: muted-foreground.
 *       Per-row inline edit/delete affordances (visible on hover/focus).
 *   - "Edit map" button — opens the EditMapSettingsModal for the map-level
 *     attributes (name, RedirectType, 3 flags). Mappings stay untouched.
 *
 * pageRoute: the current page route used as the matcher key (OQ-A closed: pageInfo.route)
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { Mapping, RedirectMapItem } from "@/lib/domain/types";
import { ChevronDown, Pencil, Settings2, Trash2 } from "lucide-react";

export interface MatchedMapGroupProps {
  map: RedirectMapItem;
  matchedMappings: Mapping[];
  pageRoute: string;
  onEditMapping: (mapping: Mapping, index: number) => void;
  onDeleteMapping: (mapping: Mapping, index: number) => void;
  onEditMapSettings: (map: RedirectMapItem) => void;
}

function FlagChip({ label }: { label: string }) {
  return (
    <Badge colorScheme="neutral" size="sm" className="font-normal">
      {label}
    </Badge>
  );
}

export function MatchedMapGroup({
  map,
  matchedMappings,
  pageRoute,
  onEditMapping,
  onDeleteMapping,
  onEditMapSettings,
}: MatchedMapGroupProps) {
  return (
    <Collapsible
      defaultOpen
      className="group/collapsible space-y-1"
      asChild
    >
      <section aria-label={`${map.name} redirect map`}>
        <CollapsibleTrigger
          className="flex w-full items-center gap-1.5 flex-wrap text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Toggle ${map.name}`}
        >
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]/collapsible:-rotate-90"
            aria-hidden="true"
          />
          <span className="text-sm font-medium">{map.name}</span>
          <Badge colorScheme="primary" size="sm">
            {redirectTypeDisplayName(map.redirectType)}
          </Badge>
          {map.preserveQueryString && <FlagChip label="Pres. QS" />}
          {map.preserveLanguage && <FlagChip label="Pres. Lang" />}
          {map.includeVirtualFolder && <FlagChip label="Virt. Folder" />}
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-1.5">
          <div className="space-y-0.5">
            {matchedMappings.map((mapping, idx) => {
              const srcMatched = mapping.source === pageRoute;
              const tgtMatched = mapping.target === pageRoute;
              return (
                <MappingRow
                  key={`${mapping.source}|${mapping.target}`}
                  mapping={mapping}
                  srcMatched={srcMatched}
                  tgtMatched={tgtMatched}
                  onEdit={() => onEditMapping(mapping, idx)}
                  onDelete={() => onDeleteMapping(mapping, idx)}
                />
              );
            })}
          </div>
          <div className="pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditMapSettings(map)}
              aria-label={`Edit settings for ${map.name}`}
            >
              <Settings2 className="h-3 w-3" />
              Edit map
            </Button>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

interface MappingRowProps {
  mapping: Mapping;
  srcMatched: boolean;
  tgtMatched: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function MappingRow({ mapping, srcMatched, tgtMatched, onEdit, onDelete }: MappingRowProps) {
  return (
    <div className="group flex items-center gap-1 py-0.5">
      <div className="flex min-w-0 flex-1 items-center gap-1 font-mono text-xs">
        <span
          className={
            srcMatched
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          }
        >
          {mapping.source}
        </span>
        <span className="text-muted-foreground" aria-hidden="true">
          {"\u2192"}
        </span>
        <span
          className={
            tgtMatched
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          }
        >
          {mapping.target}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Edit mapping"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          aria-label="Delete mapping"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
