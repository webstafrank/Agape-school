import axe from "axe-core";
import { expect } from "vitest";

/**
 * Fails the test if axe finds WCAG 2.2 A/AA problems in `container`.
 * Colour contrast is checked in the real-browser sweep instead: jsdom has no
 * layout or computed colours, so axe can't measure it here.
 */
export async function expectNoA11yViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } },
    // Don't descend into third-party iframes (e.g. Google Maps); their title is still checked.
    iframes: false,
  });
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`,
  );
  expect(summary, summary.join("\n\n")).toEqual([]);
}
