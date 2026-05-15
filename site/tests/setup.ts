import '@testing-library/jest-dom/vitest';

// Radix UI Select uses pointer-capture APIs and scrollIntoView that jsdom
// does not implement. Stub them so userEvent.click on a Radix trigger does
// not throw mid-test. Safe no-ops for the assertions we care about.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
