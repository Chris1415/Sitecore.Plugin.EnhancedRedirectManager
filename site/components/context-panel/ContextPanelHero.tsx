/**
 * ContextPanelHero — T024 (Epic E, T4), reworked PRD-002 polish 2026-05-15.
 *
 * PRD-002 polish: the headline now leads with the PAGE ROUTE, not a redirect
 * count. The split summary tile below (HeroSummaryTile in ContextPanel.tsx)
 * is the single source of truth for inbound/outbound counts — keeping a count
 * in the headline duplicated that information AND mixed units (the headline
 * counted maps, the split tile counts mappings).
 *
 * Layout:
 *   eyebrow: "Redirects for this page" (mono small caps)
 *   <h1>: page route wrapped in GradientText
 *   guidance subline (zero-match only): "Add the first redirect…"
 *
 * Motion budget (ADR-0027): no count-up needed anymore; no letter reveal; no plumes.
 */

"use client";

import { GradientText } from "@/components/ui/gradient-text";

interface ContextPanelHeroProps {
  /** The current page URL (from pageInfo.url / pageInfo.route) */
  pageUrl: string;
  /** True when there are zero matched mappings (inbound + outbound). When set,
   *  the hero shows the "Add the first redirect" guidance subline. */
  isEmpty?: boolean;
}

export function ContextPanelHero({ pageUrl, isEmpty = false }: ContextPanelHeroProps) {
  return (
    <header className="cp-header">
      <span className="cp-header__eyebrow">Redirects for this page</span>

      {/* Hero h1 — now the page route, the thing the operator actually cares about. */}
      <h1
        style={
          {
            "--v4-hero-clamp-min": "32px",
            "--v4-hero-clamp-vw": "7vw",
            "--v4-hero-clamp-max": "44px",
          } as React.CSSProperties
        }
        className="elev-hero-text cp-header__route"
      >
        <GradientText>{pageUrl}</GradientText>
      </h1>

      {/* Guidance subline — zero-match only */}
      {isEmpty && (
        <p className="cp-header__sub">
          Add the first redirect to start a map for this page.
        </p>
      )}
    </header>
  );
}
