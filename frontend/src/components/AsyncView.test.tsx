import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { AsyncView } from "./AsyncView";

vi.mock("next/navigation", () => ({ usePathname: () => "/portal/staff/results" }));

const renderError = (error: unknown, reload = vi.fn()) =>
  render(
    <AsyncView state={{ status: "error", error }} reload={reload}>
      {() => <p>content</p>}
    </AsyncView>,
  );

describe("AsyncView", () => {
  it("shows a loading state, then the content", () => {
    const { rerender } = render(
      <AsyncView<string> state={{ status: "loading" }} reload={vi.fn()}>
        {(d) => <p>{d}</p>}
      </AsyncView>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    rerender(
      <AsyncView<string> state={{ status: "ready", data: "hello" }} reload={vi.fn()}>
        {(d) => <p>{d}</p>}
      </AsyncView>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("asks to sign in again (back to this page) when the session has ended", () => {
    renderError(new ApiError(401, {}));
    expect(screen.getByRole("alert")).toHaveTextContent("Your session has ended.");
    expect(screen.getByRole("link", { name: "Sign in again" })).toHaveAttribute(
      "href",
      "/login?next=%2Fportal%2Fstaff%2Fresults&reason=expired",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("says when access is refused, without a pointless retry", () => {
    renderError(new ApiError(403, {}));
    expect(screen.getByRole("alert")).toHaveTextContent("You don't have access to this.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("suggests checking the connection when offline, and retries", async () => {
    const reload = vi.fn();
    renderError(new TypeError("fetch failed"), reload);
    expect(screen.getByRole("alert")).toHaveTextContent("Check your internet connection");
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(reload).toHaveBeenCalled();
  });
});
