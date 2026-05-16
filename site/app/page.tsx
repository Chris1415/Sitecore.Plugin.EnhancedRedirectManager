import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Supersedes the original ADR-0011 root-404 rule — this app now ships an
// IntroPage at `/` so visiting the deploy URL outside the iframe lands on
// an overview of the three surfaces. The MarketplaceProvider has moved down
// into context-panel/layout.tsx, dashboard-widget/layout.tsx, and
// full-page/layout.tsx so the intro page is not gated by the SDK handshake.
export default function IntroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6 tracking-tight">
            Redirect Manager
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            A purpose-built UI for redirect operations across a SitecoreAI
            tenant. Replaces the awkward Content-Editor workflow for managing
            items under Settings/Redirects and surfaces redirects where
            editors already work — inside the Pages editor, on the site
            dashboard, and on a dedicated full-page workshop. All three
            surfaces are backed by a single canonical data source: Sitecore
            Authoring GraphQL.
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 mb-16 border border-border/50">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Project Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="font-medium text-foreground">Title</div>
              <div className="text-muted-foreground">Redirect Manager</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Author</div>
              <div className="text-muted-foreground">Christian Hahn</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Version</div>
              <div className="text-muted-foreground">2.0.0 (PRD-002)</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Released</div>
              <div className="text-muted-foreground">
                V1 — 12.05.2026 · V2 (Blok Elevated redesign) — 15.05.2026
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="font-medium text-foreground">
                Extension Points
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Full Page</Badge>
                <Badge variant="default">Pages Context Panel</Badge>
                <Badge variant="default">Dashboard Widget</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Full Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col flex-grow">
              <div className="bg-muted rounded-lg overflow-hidden">
                <Image
                  src="/full-page-prd002.png"
                  alt="Redirect Manager — Full Page (PRD-002): workspace hero with real Last modified line and four hero CTAs, 5-tile stat strip (Redirects / 301 / 302 / Server Transfer / Conflicts), wider Redirect Maps rail, mappings table"
                  width={720}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardDescription className="text-sm leading-relaxed flex-grow">
                The power-user workshop. Site-collection + site picker drives
                a virtualized Redirect Map list. Workspace hero with real
                Last-modified line and four hero actions (Refresh / View
                activity / Validate health / Publish all). 5-tile stat strip
                including a click-through Conflicts resolver. JSON import /
                export keyed by Sitecore item GUID with a per-conflict
                three-action picker (create / overwrite / skip).
              </CardDescription>
              <Link href="/full-page" className="mt-auto mb-2">
                <Button variant="outline" className="w-full bg-transparent">
                  Open Full Page
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Pages Context Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col flex-grow">
              <div className="bg-muted rounded-lg overflow-hidden">
                <Image
                  src="/context-panel-prd002.png"
                  alt="Context Panel inside the SitecoreAI Pages editor (PRD-002): page route as the headline, split inbound/outbound count tile, inline Quick redirect form with source-or-target direction toggle"
                  width={720}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardDescription className="text-sm leading-relaxed flex-grow">
                For the page being edited, lists every redirect that affects
                it — both sources pointing here and targets this page
                redirects to — grouped by parent Redirect Map. Inline Quick
                redirect form at the top with a direction toggle (X → this
                page ↔ this page → X). Add / edit / delete inline without
                leaving the Pages editor.
              </CardDescription>
              <Link href="/context-panel" className="mt-auto mb-2">
                <Button variant="outline" className="w-full bg-transparent">
                  Open Context Panel
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Dashboard Widget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col flex-grow">
              <div className="bg-muted rounded-lg overflow-hidden">
                <Image
                  src="/dashboard-widget-prd002.png"
                  alt="Dashboard Widget (PRD-002 wide variant): all-healthy + real collisions badges, eight real stat tiles, rainbow top-destinations bar list, recently-shipped-maps panel"
                  width={720}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardDescription className="text-sm leading-relaxed flex-grow">
                Eight real-data tiles per site (Maps / Mappings / 301 / 302 /
                Server Transfer / Avg per map / Largest map / Last updated),
                a real source-URL collisions badge, a top-destinations bar
                list with rotating accent colors, and a recently-shipped-maps
                panel sourced from `map.updatedAt`. Wide-variant layout at
                ≥960px; collapses to a single column on small embeds. Site
                picker at the top right (the SDK does not surface &quot;current
                site&quot; to dashboard widgets today — pick once, persisted
                via localStorage).
              </CardDescription>
              <Link href="/dashboard-widget" className="mt-auto mb-2">
                <Button variant="outline" className="w-full bg-transparent">
                  Open Widget
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
