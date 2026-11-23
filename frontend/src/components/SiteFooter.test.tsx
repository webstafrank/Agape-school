import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("shows the school motto", () => {
    render(<SiteFooter />);
    expect(screen.getAllByText(/Your future is here/).length).toBeGreaterThan(0);
  });

  it("links to contact details and footer navigation", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /@/ })).toHaveAttribute("href", expect.stringMatching(/^mailto:/));
  });
});
