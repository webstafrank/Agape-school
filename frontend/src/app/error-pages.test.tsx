import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundaryPage from "./error";
import GlobalError from "./global-error";
import NotFound, { metadata } from "./not-found";

describe("404 page", () => {
  it("explains and offers useful links", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We couldn't find that page");
    for (const [name, href] of [["Home", "/"], ["Admissions", "/admissions"], ["Contact us", "/contact"]]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(metadata.title).toBe("Page not found");
  });
});

describe("Error page", () => {
  it("offers a retry and shows the reference code, never the raw message", async () => {
    const retry = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("db password leaked here"), { digest: "abc123" });
    render(<ErrorBoundaryPage error={error} unstable_retry={retry} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("this page didn't load");
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.queryByText(/db password/)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    spy.mockRestore();
  });

  it("global error renders a complete document", () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error("x")} unstable_retry={() => {}} />);
    expect(html).toMatch(/^<html lang="en">/);
    expect(html).toMatch(/<title>[^<]+\| Agape Education Center<\/title>/);
    expect(html).toContain("<body");
    expect(html).toContain("Try again");
    expect(html).not.toContain(">x<");
  });
});
