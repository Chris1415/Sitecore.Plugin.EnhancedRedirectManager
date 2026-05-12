/**
 * Public env flags read on the client.
 *
 * Note on NEXT_PUBLIC_* vars: Next.js inlines these at build time when
 * referenced in client code, so the read is statically resolvable per build.
 * Toggling them requires restarting the dev server (or a fresh build).
 */
export function isThemeSwitcherEnabled(): boolean {
  return process.env.NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER === "true";
}
