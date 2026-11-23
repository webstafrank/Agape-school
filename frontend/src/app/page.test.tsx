import { render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => motion.reduce };
});

afterEach(() => {
  motion.reduce = false;
});

describe("Home page", () => {
  it("shows the motto as the hero heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your future is here");
  });

  it("introduces all three school sections with links", () => {
    render(<Home />);
    const list = screen.getByRole("heading", { name: "Three sections, one journey" }).closest("section")!;
    for (const [name, href] of [
      ["Kindergarten", "/academics/kindergarten"],
      ["Primary", "/academics/primary"],
      ["Junior Secondary", "/academics/junior-secondary"],
    ]) {
      const heading = within(list).getByRole("heading", { level: 3, name });
      expect(heading.closest("a")).toHaveAttribute("href", href);
    }
  });

  it("links to Admissions from the hero", () => {
    render(<Home />);
    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!;
    expect(within(hero).getByRole("link", { name: "Apply for admission" })).toHaveAttribute("href", "/admissions");
  });

  it("animates content in by default (sections wait until scrolled into view)", async () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveStyle({ opacity: "0" });
    // The test IntersectionObserver never fires, so scroll reveals stay hidden.
    const sectionHeading = screen.getByRole("heading", { name: "Three sections, one journey" });
    await new Promise((r) => setTimeout(r, 100));
    expect(sectionHeading.parentElement).toHaveStyle({ opacity: "0" });
  });

  it("shows everything immediately, without movement, under reduced motion", async () => {
    motion.reduce = true;
    render(<Home />);
    const hero = screen.getByRole("heading", { level: 1 });
    const sectionWrapper = screen.getByRole("heading", { name: "Three sections, one journey" }).parentElement!;
    await waitFor(() => {
      expect(hero).toHaveStyle({ opacity: "1" });
      // Scroll reveals don't wait for the viewport when motion is reduced.
      expect(sectionWrapper).toHaveStyle({ opacity: "1" });
    });
    expect(hero.style.transform).toMatch(/^(none|)$/);
  });

  it("renders identical server markup regardless of motion preference (no hydration mismatch)", () => {
    // The server can't know the preference; if the client's first render differs,
    // React keeps the server's `opacity: 0` and content stays invisible.
    motion.reduce = false;
    const animated = renderToString(<Home />);
    motion.reduce = true;
    const reduced = renderToString(<Home />);
    expect(reduced).toBe(animated);
  });
});
