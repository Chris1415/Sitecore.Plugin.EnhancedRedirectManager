"use client";

/**
 * Full Page extension point (xmc:fullscreen).
 * Route: /full-page
 *
 * Placeholder — actual Full Page UI lands in Tranche 5 (T035–T046).
 * This route must exist and return 200 for the Cloud Portal iframe binding
 * to succeed at smoke gate (T065).
 */
export default function FullPagePage() {
  return (
    <main className="p-4">
      <h1 className="text-lg font-semibold">Full Page</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Redirect Manager — Full Page extension point (xmc:fullscreen).
        Full implementation in Tranches 5–7.
      </p>
    </main>
  );
}
