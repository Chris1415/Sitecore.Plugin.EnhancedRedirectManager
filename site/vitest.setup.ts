import '@testing-library/jest-dom/vitest';

// jsdom does not ship ResizeObserver; cmdk (Command component) requires it.
// Polyfill with a no-op implementation for tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom does not implement scrollIntoView; cmdk calls it on list items.
// Polyfill with a no-op for tests.
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}
