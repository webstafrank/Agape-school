import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "font-var", className: "font-class" });
  return { Comfortaa: font, Nunito_Sans: font };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import RootLayout from "./layout";

describe("Root layout", () => {
  it("starts with a skip link that targets a focusable main region", () => {
    // Render the body's children (React won't mount <html> inside a test container).
    const tree = RootLayout({ children: <p>content</p> });
    const body = (tree.props.children as React.ReactElement<{ children: React.ReactNode }>).props.children;
    render(<>{body}</>);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("Skip to main content");
    expect(links[0]).toHaveAttribute("href", "#main");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveAttribute("tabindex", "-1");
  });
});
