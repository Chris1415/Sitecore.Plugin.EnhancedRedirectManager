/**
 * Vitest mock for the `server-only` Next.js package.
 *
 * In production Next.js builds, `server-only` throws if imported in a client
 * bundle. In vitest (jsdom environment) the package does not exist so we
 * resolve it to this no-op module via the vitest.config.ts alias.
 *
 * The alias ensures tests can import and exercise server-side modules
 * (sitecoreai-token.ts, route.ts) in isolation without needing a Next.js
 * server context.
 */

// Intentionally empty — the `import "server-only"` side-effect is a
// production guard only; no runtime behaviour is needed in tests.
export {};
