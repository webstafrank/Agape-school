import "@testing-library/jest-dom/vitest";

// jsdom lacks IntersectionObserver, which framer-motion's `whileInView` needs.
// This stub never fires, so in-view animations simply stay in their initial state.
if (!("IntersectionObserver" in globalThis)) {
  class IntersectionObserverStub {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;
}
