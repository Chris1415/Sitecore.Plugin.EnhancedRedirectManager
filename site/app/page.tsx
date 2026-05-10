import { notFound } from 'next/navigation';

/**
 * Root route returns 404 per ADR-0011.
 * Cloud Portal binds extension points by their specific route URLs
 * (/context-panel, /dashboard-widget, /full-page) — never by root.
 * Returning notFound() here prevents the MarketplaceProvider from
 * hanging on the provider-init handshake when visited directly.
 */
export default function RootPage() {
  notFound();
}
