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
              <div className="text-muted-foreground">1.0.0</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Released at (V1)</div>
              <div className="text-muted-foreground">12.05.2026</div>
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
                  src="/full-page.png"
                  alt="Redirect Manager — Full Page surface"
                  width={720}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardDescription className="text-sm leading-relaxed flex-grow">
                The power-user workshop. Site-collection + site picker drives
                a virtualized Redirect Map list. Per map: editable name,
                redirect type, three flags, and a mappings table with inline
                add / edit / delete and drag-reorder. JSON import / export
                keyed by Sitecore item GUID with a per-conflict three-action
                picker (create / overwrite / skip).
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
                  src="/context-panel.png"
                  alt="Context Panel inside the SitecoreAI Pages editor"
                  width={720}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardDescription className="text-sm leading-relaxed flex-grow">
                For the page being edited, lists every redirect that affects
                it (where this page is the source or target by exact-string
                match), grouped by parent Redirect Map. Add, edit, and delete
                inline without leaving the Pages editor.
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
                  src="/dashboard-widget.png"
                  alt="Dashboard Widget on a SitecoreAI site dashboard"
                  width={720}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardDescription className="text-sm leading-relaxed flex-grow">
                Three at-a-glance count tiles on the site dashboard: Redirect
                Map items, individual mappings, and last-updated timestamp.
                Site picker at the top right because the SDK does not surface
                &quot;current site&quot; to dashboard widgets today — pick
                once and the widget remembers it via localStorage.
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
