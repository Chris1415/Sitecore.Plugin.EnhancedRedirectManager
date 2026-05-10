"use client";

/**
 * Context Panel extension point (xmc:pages:contextpanel).
 * Route: /context-panel
 *
 * Placeholder — actual Context Panel UI lands in Tranche 4 (T022–T030).
 * This route must exist and return 200 for the Cloud Portal iframe binding
 * to succeed at smoke gate (T065).
 */
export default function ContextPanelPage() {
  return (
    <main className="p-4">
      <h1 className="text-lg font-semibold">Context Panel</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Redirect Manager — Context Panel extension point (xmc:pages:contextpanel).
        Full implementation in Tranche 4.
      </p>
    </main>
  );
}
