import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mainNav } from "@/content/site";
import { SiteHeader } from "./SiteHeader";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("SiteHeader", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("renders every main nav link", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const link of mainNav) {
      expect(within(nav).getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
    }
  });

  it("marks the current section with aria-current", () => {
    pathname.current = "/academics/primary";
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Academics" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("toggles the mobile menu", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const mobile = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(mobile).getByRole("link", { name: "Admissions" })).toBeInTheDocument();

    // jsdom can't perform real navigations; stop the link's default action.
    const stopNav = (e: Event) => e.preventDefault();
    document.addEventListener("click", stopNav);
    await user.click(within(mobile).getByRole("link", { name: "Admissions" }));
    document.removeEventListener("click", stopNav);
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});

describe("SiteHeader keyboard support", () => {
  it("Escape closes the mobile menu and returns focus to its button", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    await user.click(toggle);
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    await user.tab();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });
});
